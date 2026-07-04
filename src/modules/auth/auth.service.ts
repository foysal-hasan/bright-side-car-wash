import { randomInt, createHash } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { MailService } from '../../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SojebStorage } from '../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../common/helper/date.helper';

import { StringHelper } from '../../common/helper/string.helper';
import { randomBytes } from 'crypto';
// import {decodeJWT} from '../../common/lib/JWT/jwt.service'
import * as bcrypt from 'bcrypt';
import { CreateStaffDto } from './dto/create-staff.dto';
import { DeviceInfo } from 'src/common/decorator/get-device-info.decorator';

@Injectable()
export class AuthService {
  private readonly forgotPasswordOtpExpirySeconds = 3 * 60;
  private readonly forgotPasswordOtpVerifiedExpirySeconds = 5 * 60;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    @Inject('FIREBASE_AUTH') private firebaseAuth: any,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  private getForgotPasswordOtpKey(email: string) {
    return `forgot_password_otp:${email.trim().toLowerCase()}`;
  }

  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          avatar: true,
          created_at: true,
          updated_at: true,
          roleUsers: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + user.avatar,
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

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};
      if (updateUserDto.name) {
        data.name = updateUserDto.name;
      }
      if (updateUserDto.first_name) {
        data.first_name = updateUserDto.first_name;
      }
      if (updateUserDto.last_name) {
        data.last_name = updateUserDto.last_name;
      }
      if (updateUserDto.phone_number) {
        data.phone_number = updateUserDto.phone_number;
      }
      if (updateUserDto.country) {
        data.country = updateUserDto.country;
      }
      if (updateUserDto.state) {
        data.state = updateUserDto.state;
      }
      if (updateUserDto.local_government) {
        data.local_government = updateUserDto.local_government;
      }
      if (updateUserDto.city) {
        data.city = updateUserDto.city;
      }
      if (updateUserDto.zip_code) {
        data.zip_code = updateUserDto.zip_code;
      }
      if (updateUserDto.address) {
        data.address = updateUserDto.address;
      }
      if (updateUserDto.gender) {
        data.gender = updateUserDto.gender;
      }
      if (updateUserDto.date_of_birth) {
        data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
      }
      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        }

        // upload file
        const fileName = `${StringHelper.randomString()}${image.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.avatar + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }
      const user = await this.userRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        return {
          success: true,
          message: 'User updated successfully',
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
      include: {
        roleUsers: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });



    if (user) {
      // check user status
      if(user.status === 0) {
        throw new UnauthorizedException('Your account is blocked. Please contact support.');
      }

      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });

      if (_isValidPassword) {
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
        throw new UnauthorizedException('Email or password is incorrect');
        // return {
        //   success: false,
        //   message: 'Email or password is incorrect',
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


  async login({ email, userId, roles }: { email: string; userId: string; roles: string[] }, deviceInfo: DeviceInfo) {
    try {
      // delete any existing session for the same device and user
      await this.prisma.userSession.deleteMany({
        where: {
          userId: userId,
          deviceName: deviceInfo.deviceName,
          ipAddress: deviceInfo.ip,
        },
      });

      const userSession = await this.prisma.userSession.create({
        data: {
          userId: userId,
          deviceName: deviceInfo.deviceName,
          ipAddress: deviceInfo.ip,
          expiresAt: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date,
        },
      });

      const accessTokenPayload = { email: email, sub: userId, sessionId: userSession.id, roles: roles };
      const refreshTokenPayload = { sessionId: userSession.id, sub: userId };

      // log access token expiry for debugging
      console.log("Access token expiry:", appConfig().jwt.access_token_expiry);
      console.log("Refresh token expiry:", appConfig().jwt.refresh_token_expiry);

      const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry || '7d').unixSeconds, secret: appConfig().jwt.access_token_secret });
      const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').unixSeconds, secret: appConfig().jwt.refresh_token_secret });


      // store refreshToken
      await this.redis.set(
        `refresh_token:${userSession.id}`,
        refreshToken,
        'EX',
        DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date.getTime() - new Date().getTime()
      );

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        roles: roles,
      };
    } catch (error) {
      console.log('Login error:', error);
    }

  }


  private async invalidateSession(sessionId: string, ttlSeconds: number) {
    // Flag this session ID as dead in Redis for the remainder of the access token's life
    await this.redis.set(
      `blacklist:${sessionId}`,
      'true',
      'EX',
      ttlSeconds
    );
  }

  

  async refreshToken(user_id: string, sessionId: string, refreshToken: string, deviceInfo: DeviceInfo) {
    const storedToken = await this.redis.get(`refresh_token:${sessionId}`);

    if (!storedToken || storedToken != refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user_id) {
      throw new UnauthorizedException('User not found');
    }


    // update device info of the session
    await this.prisma.userSession.delete({
      where: { id: sessionId }
    });

    const newSession = await this.prisma.userSession.create({
      data: {
        userId: user_id,
        deviceName: deviceInfo.deviceName,
        ipAddress: deviceInfo.ip,
        expiresAt: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date,
      }
    });

    const userDetails = await this.userRepository.getUserDetails(user_id);
    if (!userDetails) {
      throw new UnauthorizedException('User not found');
    }

    // delete old refresh token
    await this.redis.del(`refresh_token:${newSession.id}`);
 
    const payload = { email: userDetails.email, sub: userDetails.id, sessionId: newSession.id, roles: userDetails.roleUsers.map(item => item.role.name) };
    const accessToken = this.jwtService.sign(payload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry || '7d').unixSeconds, secret: appConfig().jwt.access_token_secret });

    const newRefreshTokenPayload = { sessionId: newSession.id, sub: user_id };
    const newRefreshToken = this.jwtService.sign(newRefreshTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').unixSeconds, secret: appConfig().jwt.refresh_token_secret });

    await this.redis.set(
      `refresh_token:${newSession.id}`,
      newRefreshToken,
      'EX',
      DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date.getTime() - new Date().getTime()
    );


    return {
      success: true,
      authorization: {
        type: 'bearer',
        access_token: accessToken,
        refresh_token: newRefreshToken,
      },
      roles: userDetails.roleUsers.map(item => item.role.name),
    };
  }

  async revokeRefreshToken(userId: string, sessionId: string) {
    const storedToken = await this.redis.get(`refresh_token:${sessionId}`);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.invalidateSession(sessionId, DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry || '7d').date.getTime() - new Date().getTime());
    await this.redis.del(`refresh_token:${sessionId}`);

    await this.prisma.userSession.delete({
      where: { id: sessionId, userId: userId }
    });

    return null;
  }

  async deviceSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return sessions;
  }



  async createStaff(createStaffDto: CreateStaffDto) {
    const { email, role, firstName, lastName } = createStaffDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Validate role
    const validRole = await this.prisma.role.findUnique({
      where: { name: role }
    });

    if (!validRole) {
      const availableRoles = await this.prisma.role.findMany({
        select: { name: true }
      });
      const roleNames = availableRoles.map(r => r.name).join(', ');

      throw new BadRequestException(
        `Invalid role: "${role}". Available roles: ${roleNames}`
      );
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 24); // 24 hours

    // Hash the token for storage (optional but recommended)
    const hashedToken = await bcrypt.hash(inviteToken, 10);

    // Create user with invite token
    const user = await this.prisma.user.create({
      data: {
        email,
        first_name: firstName,
        last_name: lastName,
        isActive: false,
        inviteToken: hashedToken,
        inviteTokenExpiry: inviteTokenExpiry,
        roleUsers: {
          create: {
            role_id: validRole.id,
          }
        }
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        isActive: true,
        inviteToken: true,
        inviteTokenExpiry: true,
        roleUsers: {
          select: {
            role: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    });

    // Generate invite URL
    const inviteUrl = `${appConfig().app.client_app_url}/auth/set-password?token=${inviteToken}&email=${encodeURIComponent(email)}`;

    // Send invite email
    await this.mailService.sendInviteEmail({
      to: email,
      firstName,
      inviteUrl
    });

    // Remove sensitive data before returning
    const { inviteToken: _, inviteTokenExpiry: __, ...result } = user;
    return result;
  }

  async setPassword(token: string, email: string, newPassword: string) {
    // Find user by email and token
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new BadRequestException('Invalid invitation');
    }

    // Check if token is valid
    if (!user.inviteToken || !user.inviteTokenExpiry) {
      throw new BadRequestException('Invalid or expired invitation');
    }


    // Verify token
    const isValidToken = await bcrypt.compare(token, user.inviteToken);
    if (!isValidToken) {
      throw new BadRequestException('Invalid invitation token');
    }

    // Check if token expired
    if (new Date() > user.inviteTokenExpiry) {
      throw new BadRequestException('Invitation has expired. Please request a new one.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        inviteToken: null,
        inviteTokenExpiry: null,
        email_verified_at: new Date(),
      },
      select: {
        id: true,
      }
    });

    return null;
  }

  async resendInvite(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('User already activated');
    }

    // Generate new token
    const inviteToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(inviteToken, 10);
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        inviteToken: hashedToken,
        inviteTokenExpiry: inviteTokenExpiry,
      },
    });

    // Send new invite
    const inviteUrl = `${appConfig().app.client_app_url}/auth/set-password?token=${inviteToken}&email=${encodeURIComponent(email)}`;

    await this.mailService.sendInviteEmail({
      to: email,
      firstName: user.first_name,
      inviteUrl: inviteUrl,
    });

    return { message: 'Invitation resent successfully' };
  }

  async register(
    {
      name,
      first_name,
      last_name,
      email,
      password,
      type,
      gender,
      date_of_birth,
      phone_number,
    }: {
      name?: string;
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      type?: string;
      gender: string;
      date_of_birth: string;
      phone_number: string;
    },
    avatar?: Express.Multer.File,
  ) {
    try {
      // Check if email already exist
      const userEmailExist = await this.userRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      // put avatar file to storage
      // upload image if provided
      let fileName: string | null = null;
      if (avatar) {
        fileName = `${StringHelper.randomString(8)}${avatar.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.avatar + '/' + fileName,
          avatar.buffer,
        );
      }

      const payload = {
        email: email,
        first_name: first_name,
        last_name: last_name,
        password: password,
        type: type,
        gender: gender,
        date_of_birth: date_of_birth,
        phone_number: phone_number,
        avatar: fileName,
      };

      const RegisterToken = this.jwtService.sign(payload, { expiresIn: '5h' });

      // create otp code
      const token = await this.ucodeRepository.createTokenRegistration({
        email: email,
        isOtp: true,
      });

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        first_name: first_name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
        register_token: RegisterToken,
      };

      // ----------------------------------------------------

      // Generate verification token
      // const token = await this.ucodeRepository.createVerificationToken({
      //   userId: user.data.id,
      //   email: email,
      // });

      // // Send verification email with token
      // await this.mailService.sendVerificationLink({
      //   email,
      //   name: email,
      //   token: token.token,
      //   type: type,
      // });

      // return {
      //   success: true,
      //   message: 'We have sent a verification link to your email',
      // };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

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
          first_name: user.name,
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

  async sendForgotPasswordOtp(email: string) {

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.exist({
      field: 'email',
      value: normalizedEmail,
    });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const otp = String(randomInt(100000, 1000000));

    await this.redis.set(
      this.getForgotPasswordOtpKey(normalizedEmail),
      otp,
      'EX',
      this.forgotPasswordOtpExpirySeconds,
    );

    await this.mailService.sendOtpCodeToEmail({
      email: normalizedEmail,
      first_name: user.first_name || user.name || user.username || normalizedEmail,
      otp: otp,
    });

    return {
      success: true,
      message: 'We have sent an OTP code to your email',
      expires_in: this.forgotPasswordOtpExpirySeconds,
    };

  }

  async verifyForgotPasswordOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const forgotPasswordOtpKey = this.getForgotPasswordOtpKey(normalizedEmail);
    const user = await this.userRepository.exist({
      field: 'email',
      value: normalizedEmail,
    });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const storedOtp = await this.redis.get(
      forgotPasswordOtpKey,
    );

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.redis.expire(
      forgotPasswordOtpKey,
      this.forgotPasswordOtpVerifiedExpirySeconds,
    );

    return {
      success: true,
      message: 'OTP verified successfully',
      expires_in: this.forgotPasswordOtpVerifiedExpirySeconds,
    };
  }

  async resetPasswordWithOtp({
    email,
    otp,
    newPassword,
  }: {
    email: string;
    otp: string;
    newPassword: string;
  }) {

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.exist({
      field: 'email',
      value: normalizedEmail,
    });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const storedOtp = await this.redis.get(
      this.getForgotPasswordOtpKey(normalizedEmail),
    );

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.userRepository.changePassword({
      email: normalizedEmail,
      password: newPassword,
    });

    await this.redis.del(this.getForgotPasswordOtpKey(normalizedEmail));

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }



  async resetPassword({ email, token, password }) {
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

  async verifyEmail({ token, registerToken }) {
    try {
      const decoded = await this.ucodeRepository.decodeJWT(registerToken);

      const email = decoded.payload.email;

      // Check user existence
      const userExist = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (userExist && userExist.email_verified_at) {
        throw new BadRequestException('Email already verified');
      }

      //  Validate OTP
      const isValidToken = await this.ucodeRepository.validateToken({
        email,
        token,
        isRegistrationVerification: true,
      });

      if (!isValidToken) {
        return {
          success: false,
          message: 'Invalid or expired token',
        };
      }

      //  Prevent double verification
      const user = await this.userRepository.createUser({
        // name: name,
        first_name: decoded.payload.first_name,
        last_name: decoded.payload.last_name,
        email: decoded.payload.email,
        password: decoded.payload.password,
        type: decoded.payload.type.toLowerCase(),
        avatar: decoded.payload.avatar,
        gender: decoded.payload.gender,
        date_of_birth: DateHelper.format(decoded.payload.date_of_birth),
        phone_number: decoded.payload.phone_number,
        role: decoded.payload.role,
      });

      if (user == null && user.success == false) throw new BadRequestException(user.message);

      // create stripe customer account
      // const stripeCustomer = await StripePayment.createCustomer({
      //   user_id: user.data.id,
      //   email: email,
      //   name: decoded.payload.first_name,
      // });

      // if (stripeCustomer) {
      //   await this.prisma.user.update({
      //     where: {
      //       id: user.data.id,
      //     },
      //     data: {
      //       billing_id: stripeCustomer.id,
      //     },
      //   });
      // }

      // // based on user role create customer or barber
      // if (decoded.payload.type == 'customer') {
      //   await this.prisma.customer.create({
      //     data: {
      //       userId: user.data.id,
      //     },
      //   });
      // }

      // if (decoded.payload.type == 'barber') {
      //   await this.prisma.barber.create({
      //     data: {
      //       userId: user.data.id,
      //     },
      //   });
      // }



      //Mark email as verified
      await this.prisma.user.update({
        where: { id: user.data.id },
        data: {
          email_verified_at: new Date(),
        },
      });

      // Generate tokens
      const payload = { sub: user.data.id, email: user.data.email };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '1h',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      // Store refresh token (single-session model)
      await this.redis.set(
        `refresh_token:${user.data.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7, // 7 days
      );

      // Cleanup OTP
      await this.ucodeRepository.deleteToken({
        email,
        token,
      });

      return {
        success: true,
        message: 'Email verified successfully',
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Verification failed',
      };
    }
  }

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
          first_name: user.name,
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
          first_name: email,
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

  async sendPhoneNumberVerificationCode(user_id: string, phone: string) {
    const code = await this.ucodeRepository.createPhoneNumberVerificationToken({
      userId: user_id,
      phone: phone,
    });
    if (code) {
      await this.mailService.sendSmsOtpCode(phone, code);
      return {
        success: true,
        message: 'We have sent a verification code to your phone number',
      };
    }
    throw new UnauthorizedException('Failed to send verification code');
  }

  // --------- verify phone number ---------
  async verifyPhoneNumber(user_id: string, phone: string, code: string) {
    const existToken =
      await this.ucodeRepository.validatePhoneNumberVerificationToken({
        userId: user_id,
        phone: phone,
        token: code,
      });
    if (existToken) {
      await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          phone_number: phone,
          isPhoneVerified: true,
        },
      });
      return {
        success: true,
        message: 'Phone number verified successfully',
      };
    }

    throw new UnauthorizedException('Invalid/Expired verification code');
  }

  async googleLogin(idToken: string) {
    try {
      const decoded = await this.firebaseAuth.verifyIdToken(idToken);
      const { email, name, uid } = decoded;

      if (!email) throw new UnauthorizedException('No email in token');

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // if (!user) {
      //   user = await this.prisma.user.create({
      //     data: {
      //       email,
      //       name: name || '',
      //       firebaseUid: uid,
      //       // maybe set other default fields
      //     },
      //   });
      // }

      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return { user, token };
    } catch (err) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
