import httpStatus from 'http-status';

import { registerUser, loginUser } from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser({ email, password, name });
    return res.status(httpStatus.CREATED).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

