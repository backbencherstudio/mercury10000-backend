import { Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../guard/role/role.enum';
import { ArrayHelper } from '../../helper/array.helper';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * get user by email
   * @param email
   * @returns
   */
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  // email varification
  async verifyEmail({ email }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  /**
   * get user details
   * @returns
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        role_users: {
          include: {
            role: {
              include: {
                permission_roles: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return user;
  }

  async getAllVolunteers() {
    const volunteers = await this.prisma.user.findMany({
      where: {
        type: UserType.VOLUNTEER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        points: true,
        created_at: true,
        avatar: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const volunteer_data = volunteers.map((volunteer) => {
      return {
        id: volunteer.id,
        name: volunteer.name,
        email: volunteer.email,
        type: volunteer.type,
        points: volunteer.points,
        created_at: volunteer.created_at,
        avatar: volunteer.avatar
          ? TajulStorage.url(
              appConfig().storageUrl.avatar + '/' + volunteer.avatar,
            )
          : '',
      };
    });

    return {
      success: true,
      message: 'Volunteers fetched successfully',
      data: volunteer_data,
    };
  }

  /**
   * Check existance
   * @returns
   */
  async exist({ field, value }) {
    const model = await this.prisma.user.findFirst({
      where: {
        [field]: value,
      },
    });
    return model;
  }

  /**
   * Create su admin user
   * @param param0
   * @returns
   */
  async createSuAdminUser({ username, email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);

      const user = await this.prisma.user.create({
        data: {
          username: username,
          email: email,
          password: password,
          type: UserType.ADMIN,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invite user under tenant
   * @param param0
   * @returns
   */
  async inviteUser({
    name,
    username,
    email,
    role_id,
  }: {
    name: string;
    username: string;
    email: string;
    role_id: string;
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: name,
          username: username,
          email: email,
        },
      });
      if (user) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
        return user;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Attach a role to a user
   * @param param0
   * @returns
   */
  async attachRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.create({
      data: {
        user_id: user_id,
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * update user role
   * @param param0
   * @returns
   */
  async syncRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.updateMany({
      where: {
        AND: [
          {
            user_id: user_id,
          },
        ],
      },
      data: {
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async createUser(payload: any) {
    try {
      const {
        name,
        email,
        password,
        phone_number,
        type,
        work_at_company,
        country,
        city,
        role_id,
        trades, // Expecting array of trade IDs
        qualified_leads_fee,
        conversion_fee,
      } = payload;

      const data: any = {
        name: name,
        email: email,
        username: email,
        phone_number: phone_number,
        type: type,
        work_at_company: work_at_company || 'N/A',
        country: country,
        city: city,
        qualified_leads_fee: qualified_leads_fee
          ? parseFloat(qualified_leads_fee)
          : 0,
        conversion_fee: conversion_fee ? parseFloat(conversion_fee) : 0,
        status: 1,
      };

      // password hashing
      if (password) {
        data.password = await bcrypt.hash(password, appConfig().security.salt);
      }

      // trade validation
      let tradeConnection = undefined;
      if (trades && Array.isArray(trades) && trades.length > 0) {
        // check trade id is valid
        const validTrades = await this.prisma.trade.findMany({
          where: {
            id: { in: trades },
          },
          select: { id: true },
        });

        if (validTrades.length > 0) {
          tradeConnection = {
            connect: validTrades.map((t) => ({ id: t.id })),
          };
        } else {
          console.warn(
            `[UserRepository] Provided trade IDs not found in DB: ${trades}`,
          );
        }
      }

      // create user
      const user = await this.prisma.user.create({
        data: {
          ...data,
          trades: tradeConnection,
        },
        include: {
          trades: true,
        },
      });

      if (user) {
        // attach role if role_id is provided
        if (role_id) {
          await this.attachRole({
            user_id: user.id,
            role_id: role_id,
          });
        }

        return {
          success: true,
          message: 'User created successfully',
          data: user,
        };
      }

      return {
        success: false,
        message: 'User creation failed',
      };
    } catch (error) {
      console.error('--- UserRepository Error ---');
      console.error(error);

      return {
        success: false,
        message: error.message || 'Internal Server Error during user creation',
      };
    }
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async updateUser(
    user_id: string,
    {
      name,
      email,
      password,
      role_id = null,
      type = 'user',
    }: {
      name?: string;
      email?: string;
      password?: string;
      role_id?: string;
      type?: string;
    },
  ) {
    try {
      const data = {};
      if (name) {
        data['name'] = name;
      }
      if (email) {
        // Check if email already exist
        const userEmailExist = await this.exist({
          field: 'email',
          value: String(email),
        });

        if (userEmailExist) {
          return {
            success: false,
            message: 'Email already exist',
          };
        }
        data['email'] = email;
      }
      if (password) {
        data['password'] = await bcrypt.hash(
          password,
          appConfig().security.salt,
        );
      }

      if (ArrayHelper.inArray(type, Object.values(Role))) {
        data['type'] = type;
      } else {
        return {
          success: false,
          message: 'Invalid user type',
        };
      }

      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });

      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          ...data,
        },
      });

      if (user) {
        if (role_id) {
          // attach role
          await this.attachRole({
            user_id: user.id,
            role_id: role_id,
          });
        }

        return {
          success: true,
          message: 'User updated successfully',
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User update failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * delete user
   * @param param0
   * @returns
   */
  async deleteUser(user_id: string) {
    try {
      // check if user exist
      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });
      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.delete({
        where: {
          id: user_id,
        },
      });
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // change password
  async changePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: password,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // change email
  async changeEmail({
    user_id,
    new_email,
  }: {
    user_id: string;
    new_email: string;
  }) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          email: new_email,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // validate password
  async validatePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } else {
      return false;
    }
  }

  // convert user type to admin/vendor
  async convertTo(user_id: string, type: string = 'vendor') {
    try {
      const userDetails = await this.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      if (userDetails.type == UserType.EDITOR) {
        return {
          success: false,
          message: 'User is already an editor',
        };
      }
      await this.prisma.user.update({
        where: { id: user_id },
        data: { type: type as UserType },
      });

      return {
        success: true,
        message: 'Converted to ' + type + ' successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // generate two factor secret
  async generate2FASecret(user_id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: user_id },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const secret = speakeasy.generateSecret();
    await this.prisma.user.update({
      where: { id: user_id },
      data: { two_factor_secret: secret.base32 },
    });

    const otpAuthUrl = secret.otpauth_url;

    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    return {
      success: true,
      message: '2FA secret generated successfully',
      data: {
        secret: secret.base32,
        qrCode: qrCode,
      },
    };
  }

  // verify two factor
  async verify2FA(user_id: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });

    if (!user || !user.two_factor_secret) return false;

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
    });

    return isValid;
  }

  // enable two factor
  async enable2FA(user_id: string) {
    const user = await this.prisma.user.update({
      where: { id: user_id },
      data: { is_two_factor_enabled: 1 },
    });
    return user;
  }

  // disable two factor
  async disable2FA(user_id: string) {
    const user = await this.prisma.user.update({
      where: { id: user_id },
      data: { is_two_factor_enabled: 0, two_factor_secret: null },
    });
    return user;
  }
}
