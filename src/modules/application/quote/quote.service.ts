import { Injectable } from '@nestjs/common';
import { DepositStatus, LeadPriority } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuoteService {
	constructor(private readonly prisma: PrismaService) {}

	async createQuote(createQuoteDto: CreateQuoteDto) {
		const existingLead = await this.prisma.lead.findUnique({
			where: { email: createQuoteDto.email },
			include: {
				stage: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (existingLead) {
			return {
				created: false,
				lead: existingLead,
			};
		}

		let stage = await this.prisma.stage.findFirst({
			where: { name: 'Quote' },
			select: {
				id: true,
				name: true,
			},
		});

		if (!stage) {
			stage = await this.prisma.stage.create({
				data: {
					name: 'Quote',
					color: '#0A3D7A',
				},
				select: {
					id: true,
					name: true,
				},
			});
		}

		const leadSource = 'Website Quote Form';
		const leadService = 'Free Quote Request';

		const quoteNotes = [
			`Quote request received for vehicle type: ${createQuoteDto.vehicle_type}`,
		];

		const lead = await this.prisma.lead.create({
			data: {
				name: createQuoteDto.full_name,
				email: createQuoteDto.email,
				phone: createQuoteDto.phone,
				vehicle: createQuoteDto.vehicle_type,
				service: leadService,
				source: leadSource,
				priority: LeadPriority.LOW,
				deposit_status: DepositStatus.PENDING,
				stage_id: stage.id,
				notes: quoteNotes,
			},
			include: {
				stage: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		await this.prisma.leadActivityTimeline.create({
			data: {
				lead_id: lead.id,
				description: 'Lead created from quote form submission',
				source: leadSource,
			},
		});

		return {
			created: true,
			lead,
		};
	}
}
