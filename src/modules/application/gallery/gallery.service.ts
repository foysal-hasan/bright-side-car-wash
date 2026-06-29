import { Injectable } from '@nestjs/common';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) { }
  async findAll() {
    const result = await this.prisma.gallery.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        image: true,
        created_at: true,
        updated_at: true,
      },
    });

    result.forEach(gallery => {
      if (gallery.image) {
        const key = `${appConfig().storageUrl.gallery}${gallery.image}`;
        gallery.image = SojebStorage.url(key);
      }
    });

    return result;
  }
}
