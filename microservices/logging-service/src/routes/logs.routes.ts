import { Router, Request, Response } from 'express';
import Log from '../models/Log.js';
import { RabbitMQService } from '../services/rabbitmq.service.js';

const router = Router();

let rabbitMQService: RabbitMQService;

export const setRabbitMQService = (service: RabbitMQService) => {
  rabbitMQService = service;
};

/**
 * @route POST /logs
 * @description Fetch all logs from RabbitMQ queue and save to database
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📥 Fetching all logs from RabbitMQ queue...');
    
    await rabbitMQService.fetchAllLogs();
    
    const logCount = await Log.countDocuments();
    
    res.status(200).json({
      success: true,
      message: 'Logs fetched from RabbitMQ and saved to database',
      totalLogsInDatabase: logCount
    });
  } catch (error: any) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs from RabbitMQ',
      error: error.message
    });
  }
});

/**
 * @route GET /logs/:dateFrom/:dateTo
 * @description Get all logs between two dates
 * @param dateFrom - Start date (YYYY-MM-DD)
 * @param dateTo - End date (YYYY-MM-DD)
 */
router.get('/:dateFrom/:dateTo', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.params;
    
    // Parse dates
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Query logs
    const logs = await Log.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ timestamp: -1 });
    
    res.status(200).json({
      success: true,
      count: logs.length,
      dateRange: {
        from: dateFrom,
        to: dateTo
      },
      logs: logs.map(log => ({
        timestamp: log.timestamp,
        logType: log.logType,
        url: log.url,
        correlationId: log.correlationId,
        applicationName: log.applicationName,
        message: log.message,
        additionalData: log.additionalData
      }))
    });
  } catch (error: any) {
    console.error('❌ Error retrieving logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
});

/**
 * @route DELETE /logs
 * @description Delete all logs from database
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const result = await Log.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: 'All logs deleted from database',
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('❌ Error deleting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete logs',
      error: error.message
    });
  }
});

export default router;
