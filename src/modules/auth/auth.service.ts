// external imports
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

//internal imports
import { TajulStorage } from '../../common/lib/Disk/TajulStorage';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UserRepository } from '../../common/repository/user/user.repository';
import appConfig from '../../config/app.config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  //
  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          avatar: true,
          address: true,
          type: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = TajulStorage.url(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async register(data: any) {
    try {
      // 1. Check if email already exists
      const userEmailExist = await this.userRepository.exist({
        field: 'email',
        value: String(data.email),
      });

      if (userEmailExist) {
        console.warn(
          `[Register] Attempt to register with existing email: ${data.email}`,
        );
        return {
          success: false, // consistency বজায় রাখার জন্য success: false দিন
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      // 2. Create User via Repository
      console.log('[Register] Creating user with data:', {
        ...data,
        password: '***',
      });

      const user = await this.userRepository.createUser({
        ...data,
        name: data.username,
      });

      // 3. Handle Repository Response
      if (!user || user.success === false) {
        console.error(
          '[Register] Repository failed to create user:',
          user?.message,
        );
        return {
          success: false,
          message: user?.message || 'Failed to create account',
        };
      }

      console.log('[Register] User created successfully:', user.data?.id);

      return {
        success: true,
        message: 'Account created successfully',
        data: user.data,
      };
    } catch (error) {
      console.error('[Register] Critical Error:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  // get single user
  async getSingleUser(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          phone_number: true,
          trades: true,
          email: true,
          city: true,
          country: true,
          conversion_fee: true,
          qualified_leads_fee: true,
          type: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user) {
        return {
          success: true,
          message: 'User fetched successfully',
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // get all users with pagination
  async getAllUsers({ page, limit }: { page: number; limit: number }) {
    try {
      const users = await this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          type: 'USER',
        },
        select: {
          id: true,
          name: true,
          phone_number: true,
          trades: true,
          email: true,
          city: true,
          country: true,
          type: true,
        },
      });
      return {
        success: true,
        message: 'All users fetched successfully',
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // get all secretary with pagination
  async getAllSecretary({
    page,
    limit,
    user_id,
  }: {
    page: number;
    limit: number;
    user_id: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      if (user.type !== 'SUP_ADMIN') {
        return {
          success: false,
          message: 'You are not authorized to perform this action',
        };
      }
      const users = await this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          type: 'SECRETARY',
        },
        select: {
          id: true,
          name: true,
          phone_number: true,
          trades: true,
          email: true,
          city: true,
          country: true,
          type: true,
        },
      });
      return {
        success: true,
        message: 'All users fetched successfully',
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // done
  async login({
    email,
    userId,
    fcm_token,
  }: {
    email: string;
    userId: string;
    fcm_token?: string;
  }) {
    const userActive = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!userActive) {
      return {
        success: false,
        message: 'Please wait for admin approval',
      };
    }

    try {
      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcm_token: fcm_token,
          },
        });
      }
      // ---------------------------------------------------------

      const payload = { email: email, sub: userId, type: 'user' };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '10d' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

      const user = await this.userRepository.getUserDetails(userId);

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        userid: user.id,
        type: user.type,
        fcm_token: user.fcm_token,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // update user
  async updateUser(
    id: string,
    requestingUserId: string, // Requesting User ID (JWT payload)
    dto: UpdateUserDto,
  ) {
    try {
      // 1. Requesting User (Auth User) fetch kora tar type check korar jonno
      const authUser = await this.prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { type: true }, // Performance optimized: shudhu type-ta nilam
      });

      if (!authUser) {
        return { success: false, message: 'Authenticated user not found' };
      }

      const isAdmin = authUser.type === 'SUP_ADMIN';
      const isSelf = id === requestingUserId;

      if (!isAdmin && !isSelf) {
        return {
          success: false,
          message:
            'Unauthorized: You do not have permission to update this profile',
        };
      }

      // 3. Target User fetch kora (Checking if target exists)
      const targetUser = await this.prisma.user.findUnique({ where: { id } });
      if (!targetUser)
        return { success: false, message: 'Target user not found' };

      // 4. Phone unique check (Jodi phone change hoy)
      if (dto.phone_number && dto.phone_number !== targetUser.phone_number) {
        const exists = await this.prisma.user.findFirst({
          where: { phone_number: dto.phone_number },
        });
        if (exists)
          return { success: false, message: 'Phone number already exists' };
      }

      // 6. Final Update with Prisma snack_case mapping
      await this.prisma.user.update({
        where: { id },
        data: {
          ...dto,
          updated_at: new Date(),
        },
      });

      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  // done
  async forgotPassword(email) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // done
  async resendToken(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          time: 2,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a token code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // done
  async verifyToken({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const result = await this.ucodeRepository.verifyToken({
          email: email,
          token: token,
        });

        // Check the actual success property, not just if object exists
        if (result && result.success) {
          return {
            success: true,
            message: result.message || 'Token verified successfully',
          };
        } else {
          return {
            success: false,
            message: result?.message || 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  //done
  async verifyEmail({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async resendVerificationEmail(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.verifycheckToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.userRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await this.userRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await this.userRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ---------------------------------(end)---------------------------------------

  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userDetails = await this.userRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const payload = {
        email: userDetails.email,
        sub: userDetails.id,
        type: userDetails.type,
      };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        success: true,
        authorization: {
          type: 'bearer',
          access_token: accessToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: 'Refresh token not found',
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: 'Refresh token revoked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await this.userRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        // Check if email is verified
        // if (!user.email_verified_at) {
        //   throw new UnauthorizedException(
        //     'Please verify your email before logging in',
        //   );
        // }
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await this.userRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await this.userRepository.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await this.userRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.enable2FA(user_id);
        return {
          success: true,
          message: '2FA enabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.disable2FA(user_id);
        return {
          success: true,
          message: '2FA disabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  async allVolunteer(user_id: string) {
    try {
      // Check if the requesting user exists
      const user = await this.userRepository.getUserDetails(user_id);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const volunteers = await this.userRepository.getAllVolunteers();

      return {
        success: true,
        message: 'Volunteers fetched successfully',
        data: volunteers,
      };
    } catch (error) {
      // Production e error log kora bhalo
      console.error('Error fetching volunteers:', error);
      return {
        success: false,
        message: error.message || 'Internal server error',
      };
    }
  }
}
