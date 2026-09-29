import { randomInt, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { DateHelper } from '../../helper/date.helper';
import { UserRepository } from '../user/user.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UcodeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) { }

  /**
   * create ucode token
   * @returns
   */
  async createToken({
    userId,
    expired_at = null,
    isOtp = false,
    email = null,
  }): Promise<string> {
    // OTP valid for 5 minutes
    const otpExpiryTime = 5 * 60 * 1000;
    expired_at = new Date(Date.now() + otpExpiryTime);

    const userDetails = await this.userRepository.getUserDetails(userId);
    if (userDetails && userDetails.email) {
      let token: string;
      if (isOtp) {
        // create 6 digit otp code
        // token = String(Math.floor(100000 + Math.random() * 900000));
        token = String(randomInt(100000, 1000000));
      } else {
        token = uuid();
      }
      const data = await this.prisma.ucode.create({
        data: {
          user_id: userId,
          token: token,
          email: email ?? userDetails.email,
          expired_at: expired_at,
        },
      });
      return data.token;
    } else {
      return null;
    }
  }

  async createTokenRegistration({
    expired_at = null,
    isOtp = false,
    email = null,
  }): Promise<string> {
    // OTP valid for 5 minutes
    const otpExpiryTime = 5 * 60 * 1000;
    expired_at = new Date(Date.now() + otpExpiryTime);
    try {
      // if email exist delete existing token
      await this.prisma.ucode.deleteMany({
        where: {
          email: email,
        },
      });
      let token: string;
      if (isOtp) {
        // create 6 digit otp code
        // token = String(Math.floor(100000 + Math.random() * 900000));
        token = String(randomInt(100000, 1000000));
      } else {
        token = uuid();
      }
      const data = await this.prisma.ucode.create({
        data: {
          email: email,
          token: token,
          expired_at: expired_at,
        },
      });
      return data.token;
    } catch (err) {
      throw err;
    }
  }
  /**
   * validate ucode token
   * @returns
   */
  async validateToken({
    email,
    token,
    forEmailChange = false,
    isRegistrationVerification = false,
  }: {
    email: string;
    token: string;
    forEmailChange?: boolean;
    isRegistrationVerification?: boolean;
  }) {
    const userDetails = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    let proceedNext = true;
    if (forEmailChange == true) {
      proceedNext = true;
    } else if (isRegistrationVerification == true) {
      proceedNext = true;
    }
    else {
      if (userDetails && userDetails.email) {
        proceedNext = true;
      }
    }

    if (proceedNext) {
      const date = DateHelper.now().toISOString();
      const existToken = await this.prisma.ucode.findFirst({
        where: {
          AND: {
            token: token,
            email: email,
          },
        },
      });

      if (existToken) {
        if (existToken.expired_at) {
          const data = await this.prisma.ucode.findFirst({
            where: {
              AND: [
                {
                  token: token,
                },
                {
                  email: email,
                },
                {
                  expired_at: {
                    gte: date,
                  },
                },
              ],
            },
          });
          if (data) {
            // delete this token
            // await prisma.ucode.delete({
            //   where: {
            //     id: data.id,
            //   },
            // });
            return true;
          } else {
            return false;
          }
        } else {
          // delete this token
          await this.prisma.ucode.delete({
            where: {
              id: existToken.id,
            },
          });
          return true;
        }
      }
    } else {
      return false;
    }
  }

  /**
   * delete ucode token
   * @returns
   */
  async deleteToken({ email, token }) {
    await this.prisma.ucode.deleteMany({
      where: {
        AND: [{ email: email }, { token: token }],
      },
    });
  }

  async createVerificationToken(params: { userId: string; email: string }) {
    try {
      const token = randomBytes(32).toString('hex');

      const ucode = await this.prisma.ucode.create({
        data: {
          user_id: params.userId,
          email: params.email,
          token: token,
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 1,
        },
      });

      return ucode;
    } catch (error) {
      return null;
    }
  }

  /**
   * create phone number verification token
   * @returns
   */
  async createPhoneNumberVerificationToken(params: {
    userId: string;
    phone: string;
  }) {
    try {
      const otpExpiryTime = 5 * 60 * 1000;
      const expired_at = new Date(Date.now() + otpExpiryTime);
      // const token = String(randomInt(100000, 1000000));
      const token = '000000';

      // delete existing token
      await this.prisma.ucode.deleteMany({
        where: {
          user_id: params.userId,
          phone_number: params.phone,
        },
      });

      await this.prisma.ucode.create({
        data: {
          user_id: params.userId,
          phone_number: params.phone,
          token: token,
          expired_at: expired_at,
        },
      });
      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * validate phone number verification token
   * @returns
   */
  async validatePhoneNumberVerificationToken(params: {
    userId: string;
    phone: string;
    token: string;
  }) {
    try {
      const ucode = await this.prisma.ucode.findFirst({
        where: {
          user_id: params.userId,
          token: params.token,
          phone_number: params.phone,
        },
      });
      if (ucode) {
        if (ucode.expired_at && ucode.expired_at > new Date()) {
          await this.prisma.ucode.delete({
            where: {
              id: ucode.id,
            },
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      return null;
    }
  }

  async decodeJWT(token: string) {
    try {
      // Split the token into parts
      const parts = token.split('.');

      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode header and payload (base64url decode)
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      return {
        header,
        payload,
        signature: parts[2]
      };
    } catch (error: any) {
      throw new Error(`Failed to decode JWT: ${error?.message}`);
    }
  }
}
