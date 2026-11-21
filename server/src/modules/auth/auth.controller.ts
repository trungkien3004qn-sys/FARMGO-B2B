import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('Auth (Xác thực & Phân quyền)')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Lấy danh sách tài khoản demo theo phân hệ (Buyer, Supplier, Driver, Admin)' })
  getAccounts() {
    return this.authService.getAccounts();
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (Buyer / Supplier / Driver)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống (Lấy JWT Access Token)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  getProfile(@Request() req: any) {
    return req.user;
  }
}
