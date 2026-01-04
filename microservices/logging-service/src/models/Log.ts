import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  timestamp: Date;
  logType: string;
  url: string;
  correlationId: string;
  applicationName: string;
  message: string;
  additionalData?: any;
}

const LogSchema: Schema = new Schema({
  timestamp: { type: Date, required: true },
  logType: { type: String, required: true, enum: ['INFO', 'ERROR', 'WARN'] },
  url: { type: String, required: true },
  correlationId: { type: String, required: true },
  applicationName: { type: String, required: true },
  message: { type: String, required: true },
  additionalData: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Index for date-based queries
LogSchema.index({ timestamp: 1 });
LogSchema.index({ correlationId: 1 });

export default mongoose.model<ILog>('Log', LogSchema);
