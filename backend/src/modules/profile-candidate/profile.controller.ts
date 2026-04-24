import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProfileService } from './profile.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

import {
  UserProfileResponseDto,
  CandidateProfileResponseDto,
  GithubConnectionResponseDto,
  SimpleMessageResponseDto,
} from './dto/profile.response.dto';

import { VerifiedAuth } from 'src/shared/decorators/verified.decorator';

@VerifiedAuth()
@ApiBearerAuth()
@ApiTags('Profile (candidate)')
@Controller('me/user')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ───────────────── USER PROFILE ─────────────────

  @Get()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns authenticated user profile including linked auth providers (Google, GitHub, etc).',
  })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates first name, last name, and username.',
  })
  @ApiOkResponse({ type: UserProfileResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation or username conflict error',
  })
  updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate account',
    description: 'Marks the user account as suspended.',
  })
  @ApiOkResponse({ type: SimpleMessageResponseDto })
  deactivateAccount(@Req() req: any) {
    return this.profileService.deactivateAccount(req.user.id);
  }

  // ───────────────── CANDIDATE PROFILE ─────────────────

  @Get('candidate')
  @ApiOperation({
    summary: 'Get candidate profile',
    description:
      'Returns candidate-specific data including bio, career path, and dev profile.',
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Candidate profile not found' })
  getCandidateProfile(@Req() req: any) {
    return this.profileService.getCandidateProfile(req.user.id);
  }

  @Patch('candidate')
  @ApiOperation({
    summary: 'Update candidate profile',
    description: 'Updates bio and career path.',
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  updateCandidateProfile(@Req() req: any, @Body() dto: UpdateCandidateDto) {
    return this.profileService.updateCandidateProfile(req.user.id, dto);
  }

  // ───────────────── GITHUB ─────────────────

  @Get('github')
  @ApiOperation({
    summary: 'Get GitHub connection status',
    description:
      'Returns whether GitHub is connected and sync status (without exposing tokens).',
  })
  @ApiOkResponse({ type: GithubConnectionResponseDto })
  @ApiNotFoundResponse({ description: 'Candidate profile not found' })
  getConnectedGithub(@Req() req: any) {
    return this.profileService.getConnectedGithub(req.user.id);
  }
}
