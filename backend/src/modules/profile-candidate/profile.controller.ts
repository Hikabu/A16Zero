import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateUserDto} from './dto/update-user.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { VerifiedAuth } from 'src/shared/decorators/verified.decorator';
import { ApiBearerAuth } from '@nestjs/swagger/dist/decorators/api-bearer.decorator';


@VerifiedAuth()
@ApiBearerAuth()
@Controller('me/user')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ─── User Profile ──────────────────────────────────────────────────────────

  /**
   * GET /me
   * Returns the authenticated user's profile + linked auth providers
   */
  @Get()
  getProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.profileService.getProfile(userId);
  }

  /**
   * PATCH /me
   * Update firstName, lastName, username
   */
  @Patch()
  updateProfile(
    @Req() req: any,
    @Body() dto: UpdateUserDto,
  ) {
    const userId = req.user.id;
    return this.profileService.updateProfile(userId, dto);
  }

  /**
   * DELETE /me
   * Deactivates the account (sets accountStatus = SUSPENDED)
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  deactivateAccount(@Req() req: any) {
    const userId = req.user.id; 
    return this.profileService.deactivateAccount(userId);
  }

  // ─── Candidate Profile ─────────────────────────────────────────────────────

  /**
   * GET /me/candidate
   * Returns the candidate profile: bio, careerPath, scorecard, devProfile
   */
  @Get('candidate')
  getCandidateProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.profileService.getCandidateProfile(userId);
  }

  /**
   * PATCH /me/candidate
   * Update bio and/or careerPath
   */
  @Patch('candidate')
  updateCandidateProfile(
    @Req() req: any,
    @Body() dto: UpdateCandidateDto,
  ) {
    const userId = req.user.id;
    return this.profileService.updateCandidateProfile(userId, dto);
  }

  // ─── GitHub Connection ─────────────────────────────────────────────────────

  /**
   * GET /me/github
   * Returns the connected GitHub account info (username, scopes, sync status)
   * Does NOT expose the encrypted token
   */
  @Get('github')
  getConnectedGithub(@Req() req: any) {
    const userId = req.user.id;
    return this.profileService.getConnectedGithub(userId);
  }
}