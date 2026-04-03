import httpStatus from 'http-status';

import { sendOtp, verifyOtpAndIssueToken } from '../services/otp.service.js';

export const sendOtpController = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const result = await sendOtp({ phone });
    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

export const verifyOtpController = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const result = await verifyOtpAndIssueToken({ phone, otp });
    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

