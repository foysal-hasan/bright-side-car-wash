import { Inject, Injectable } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { IEmailProvider } from './interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from './constants';

@Injectable()
export class CampaignService {
  constructor(@Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: IEmailProvider) { }
  
  async create(createCampaignDto: CreateCampaignDto) {
    return await this.emailProvider.createCampaign({
      htmlContent: "<h1>Hello, this is a test campaign</h1>",
      name: "campaign 001",
      subject: "this is test campaign",
      sender: {
        name: "Bright Side Car Wash",
        email: "foysalhasan.bdcalling@gmail.com"
      },
      recipients: {
          listIds: [],
          segmentIds: []
      },
    });

  }

  findAll() {
    return `This action returns all campaign`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campaign`;
  }

  update(id: number, updateCampaignDto: UpdateCampaignDto) {
    return `This action updates a #${id} campaign`;
  }

  remove(id: number) {
    return `This action removes a #${id} campaign`;
  }
}
