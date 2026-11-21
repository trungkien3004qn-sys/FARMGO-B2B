import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@farmgo.vn', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'admin123', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'quan_an_ngon@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nhà hàng Bếp Quê' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BUYER', enum: ['BUYER', 'SUPPLIER', 'ADMIN', 'DRIVER'] })
  @IsString()
  role: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Công ty TNHH Bếp Quê', required: false })
  @IsOptional()
  companyName?: string;

  @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM', required: false })
  @IsOptional()
  address?: string;
}
