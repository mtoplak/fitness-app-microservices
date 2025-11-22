import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller()
export class GatewayController {
  private readonly serviceUrls: Map<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrls = new Map([
      ['/api/users', this.configService.get('USER_SERVICE_URL')],
      ['/api/subscriptions', this.configService.get('SUBSCRIPTION_SERVICE_URL')],
      ['/api/trainer-bookings', this.configService.get('TRAINER_BOOKING_SERVICE_URL')],
      ['/api/schedules', this.configService.get('WORKOUT_SCHEDULE_SERVICE_URL')],
      ['/api/class-bookings', this.configService.get('GROUP_CLASS_BOOKING_SERVICE_URL')],
      ['/api/reports', this.configService.get('ADMIN_REPORTING_SERVICE_URL')],
    ]);
  }

  @All('*')
  async gateway(@Req() req: Request, @Res() res: Response) {
    try {
      const serviceUrl = this.getServiceUrl(req.path);
      const targetPath = this.getTargetPath(req.path);

      const url = `${serviceUrl}${targetPath}`;
      
      const config: any = {
        method: req.method,
        url,
        headers: { ...req.headers, host: undefined },
      };

      if (req.body && Object.keys(req.body).length > 0) {
        config.data = req.body;
      }

      if (req.query && Object.keys(req.query).length > 0) {
        config.params = req.query;
      }

      const response = await firstValueFrom(this.httpService.request(config));
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('Gateway error:', error.message);
      const status = error.response?.status || 500;
      const data = error.response?.data || { message: 'Internal server error' };
      res.status(status).json(data);
    }
  }

  private getServiceUrl(path: string): string {
    for (const [prefix, url] of this.serviceUrls.entries()) {
      if (path.startsWith(prefix)) {
        return url;
      }
    }
    throw new Error(`No service found for path: ${path}`);
  }

  private getTargetPath(path: string): string {
    for (const prefix of this.serviceUrls.keys()) {
      if (path.startsWith(prefix)) {
        return path.replace(prefix, '');
      }
    }
    return path;
  }
}
