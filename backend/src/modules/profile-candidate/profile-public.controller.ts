import {
  Controller,
  Get,
  Param,
  Query
} from '@nestjs/common';
import {
  ApiTags,
} from '@nestjs/swagger';

import { ProfileService } from './profile.service';

@ApiTags('Public Profiles')
@Controller('profile')
export class PublicProfileController {
  constructor(
    private readonly profileService: ProfileService,
  ) {}

  @Get('public/:username')
  getPublicProfile(
    @Param('username') username: string,
  ) {
    return this.profileService.getPublicProfile(
      username,
    );
  }

    @Get('public')
  searchPublicProfiles(@Query('q') q?: string) {
    return this.profileService.searchPublicProfiles(q || '');
  }
}