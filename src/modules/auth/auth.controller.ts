import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiExcludeController, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UserRole } from 'src/generated/prisma/enums';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyForgotPasswordOtpDto } from './dto/verify-forgot-password-otp.dto';
import { ResetPasswordWithOtpDto } from './dto/reset-password-with-otp.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { ResendInviteDto } from './dto/resend-invite.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @ApiOperation({ summary: 'Get user details' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Register a user' })
  @Post('register')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
    }),
  )
  async create(
    @Body() data: CreateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const name = data.name;
      const first_name = data.first_name;
      const last_name = data.last_name;
      const email = data.email;
      const password = data.password;
      const type = data.type;

      const avatar = image; //
      let userRole = null;



      // if (!name) {
      //   throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!first_name) {
        throw new HttpException(
          'First name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!last_name) {
        throw new HttpException(
          'Last name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }




      const response = await this.authService.register(
        {
          name: name,
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: password,
          type: type,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          phone_number: data.phone_number,
          userRole: userRole,
        },
        avatar,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // invite staff
  @ApiOperation({ summary: 'Invite staff' })
  @ApiBearerAuth()
    @ApiOperation({ 
    summary: 'Invite staff member',
    description: `
      Send an invitation to a new staff member.
      
      **Flow:**
      1. Admin provides first name, last name, email and role
      2. System creates user with pending status
      3. Invitation email is sent with secure link
      4. User sets password via invitation link
      5. Account becomes active after password setup
      
      **Role Requirements:**
      - Roles are validated against database
      - Available roles: admin, manager, staff, super_admin
    `
  })
  @ApiBearerAuth('access-token')
  @RequirePermission('staff:invite')
  @ApiBody({ 
    type: CreateStaffDto,
    description: 'Staff member details for invitation',
    examples: {
      'admin_invite': {
        summary: 'Invite an Admin',
        description: 'Invite a new administrator with full access',
        value: {
          email: 'admin.john@company.com',
          role: 'admin',
          firstName: 'John',
          lastName: 'Doe'
        }
      },
      'manager_invite': {
        summary: 'Invite a Manager',
        description: 'Invite a new department manager',
        value: {
          email: 'manager.jane@company.com',
          role: 'manager',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      },
      'staff_invite': {
        summary: 'Invite Regular Staff',
        description: 'Invite a regular staff member',
        value: {
          email: 'staff.mike@company.com',
          role: 'staff',
          firstName: 'Mike',
          lastName: 'Johnson',
        }
      }
    }
  })

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('staff:invite')
  @Post('invite-staff')
  async inviteStaff(@Body() createStaffDto: CreateStaffDto) {
      const response = await this.authService.createStaff(createStaffDto);
      return {
        success: true,
        message: 'Staff invited successfully',
        data: response,
      }
  }

 @ApiOperation({ 
    summary: 'Resend staff invitation',
    description: 'Resend the invitation email to a staff member who hasn\'t activated their account yet.'
  })
  @ApiBody({ 
    type: ResendInviteDto,
    description: 'Email of the staff member to resend the invitation to'
  })
   @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    schema: {
      example: {
        success: true,
        message: 'Invitation resent successfully',
        data: null
      }
    }
  })
  @ApiBearerAuth()
 

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('staff:invite')
  @Post('resend-invite')
  async resendInvite(@Body() body: ResendInviteDto) {
      await this.authService.resendInvite(body.email);
      return {
        success: true,
        message: 'Invitation resent successfully',
        data: null,
      }
  }

  // set password for invited staff  @ApiOperation({ summary: 'Set password for invited staff' })
  @ApiBody({ 
    type: ResetPasswordDto,
    description: 'Set password for an invited staff member using the token from the invitation email'
  })
  @Post('set-password')
  async setPassword(@Body() body: ResetPasswordDto) {
      const { token, email, password } = body;
      const response = await this.authService.setPassword(token, email, password);
      return {
        success: true,
        message: 'Password set successfully',
        data: response,
      }
  }

  // login user
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() _loginDto: LoginDto,
    @Res() res: Response,
  ) {
    try {
      const user_id = req.user.id;
      const user_email = req.user.email;

      const roleNames = req.user.roleUsers.map(item => item.role.name);

      const response = await this.authService.login({
        userId: user_id,
        email: user_email,
        roles: roleNames,
      });

      // store to secure cookies
      res.cookie('refresh_token', response.authorization.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      res.json(response);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const { user, token } = await this.authService.googleLogin(dto.token);
    // Remove sensitive fields if any
    const { password, ...safeUser } = user;
    return {
      message: 'Login success',
      user: safeUser,
      token,
    };
  }

  // @Get('google/redirect')
  // @UseGuards(AuthGuard('google'))
  // async googleLoginRedirect(@Req() req: Request): Promise<any> {
  //   return {
  //     statusCode: HttpStatus.OK,
  //     data: req.user,
  //   };
  // }

  @ApiExcludeEndpoint()
  // update user
  @ApiOperation({ summary: 'Update user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      // storage: diskStorage({
      //   destination:
      //     appConfig().storageUrl.rootUrl + appConfig().storageUrl.avatar,
      //   filename: (req, file, cb) => {
      //     const randomName = Array(32)
      //       .fill(null)
      //       .map(() => Math.round(Math.random() * 16).toString(16))
      //       .join('');
      //     return cb(null, `${randomName}${file.originalname}`);
      //   },
      // }),
      storage: memoryStorage(),
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  // --------------change password---------

  // @ApiOperation({ summary: 'Forgot password' })
  // @Post('forgot-password')
  // @ApiBody({ type: ForgotPasswordDto })
  // async forgotPassword(@Body() data: ForgotPasswordDto) {
  //   try {
  //     const email = data.email;
  //     if (!email) {
  //       throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
  //     }
  //     return await this.authService.forgotPassword(email);
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: 'Something went wrong',
  //     };
  //   }
  // }

  @ApiOperation({ summary: 'Send forgot password OTP' })
  @Post('forgot-password/send-otp')
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.sendForgotPasswordOtp(email);
  }

  @ApiOperation({ summary: 'Verify forgot password OTP' })
  @Post('forgot-password/verify-otp')
  @ApiBody({ type: VerifyForgotPasswordOtpDto })
  async verifyForgotPasswordOtp(@Body() data: VerifyForgotPasswordOtpDto) {
      const email = data.email;
      const otp = data.otp;

      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!otp) {
        throw new HttpException('OTP not provided', HttpStatus.UNAUTHORIZED);
      }

      return await this.authService.verifyForgotPasswordOtp(email, otp);
    
  }

  @ApiExcludeEndpoint()
  // verify email to verify the email
  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      // const email = data.email;
      const token = data.token;
      const registerToken = data.register_token;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        token: token,
        registerToken: registerToken,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }


  @ApiExcludeEndpoint()
  // send phone number verification code
  @ApiOperation({ summary: 'Send phone number verification code' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-phone-number-verification-code')
  async sendPhoneNumberVerificationCode(@Req() req: Request, @Body() data: { phone: string }) {
    const user_id = req.user.userId;
    const phone = data?.phone;
    if (!phone) {
      throw new HttpException('Phone number not provided', HttpStatus.UNAUTHORIZED);
    }

    // validate phone number format + country code + space or without space
    if (!phone.match(/^[+][0-9]{1,3}[ ]?[0-9]{10}$/)) {
      throw new HttpException('Invalid phone number', HttpStatus.UNAUTHORIZED);
    }

    return await this.authService.sendPhoneNumberVerificationCode(user_id, phone);
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Verify phone number' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-phone-number')
  async verifyPhoneNumber(@Req() req: Request, @Body() data: { phone: string, code: string }) {
    const phone = data?.phone;
    const code = data?.code;
    if (!phone) {
      throw new HttpException('Phone number not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!code) {
      throw new HttpException('Code not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.verifyPhoneNumber(req.user.userId, phone, code);
  }

  @ApiExcludeEndpoint()
  // resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  // reset password if user forget the password
  // @ApiOperation({ summary: 'Reset password' })
  // @Post('reset-password')
  // @ApiBody({ type: ResetPasswordDto })
  // async resetPassword(@Body() data: ResetPasswordDto) {
  //   try {
  //     const email = data.email;
  //     const token = data.token;
  //     const password = data.password;
  //     if (!email) {
  //       throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
  //     }
  //     if (!token) {
  //       throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
  //     }
  //     if (!password) {
  //       throw new HttpException(
  //         'Password not provided',
  //         HttpStatus.UNAUTHORIZED,
  //       );
  //     }
  //     return await this.authService.resetPassword({
  //       email: email,
  //       token: token,
  //       password: password,
  //     });
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: 'Something went wrong',
  //     };
  //   }
  // }

  @ApiOperation({ summary: 'Reset password with OTP' })
  @Post('forgot-password/reset-password')
  @ApiBody({ type: ResetPasswordWithOtpDto })
  async resetPassword(@Body() data: ResetPasswordWithOtpDto) {
    try {
      const email = data.email;
      const otp = data.otp;
      const newPassword = data.new_password;

      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!otp) {
        throw new HttpException('OTP not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return await this.authService.resetPasswordWithOtp({
        email: email,
        otp: otp,
        newPassword: newPassword,
      });
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Something went wrong',
      };
    }
  }

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: ChangePasswordDto,
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  // --------------end change password---------

  // -------change email address------
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'request email change' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Change email address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  @ApiExcludeEndpoint()
  // --------- 2FA ---------
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Verify 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------
}
