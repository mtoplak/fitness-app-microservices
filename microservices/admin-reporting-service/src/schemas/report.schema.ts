import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['revenue', 'attendance', 'membership', 'activity'] })
  type: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: Object })
  data: any; // Flexible structure for report data (aggregated stats)

  @Prop()
  generatedBy: string; // Admin ID
}

export const ReportSchema = SchemaFactory.createForClass(Report);
