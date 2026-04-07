import httpStatus from 'http-status'; // Easy-to-read names for HTTP status codes
import { verifyToken } from '../utils/jwt.js'; // Helper for verifying the identity of a JWT login token
import { ApiError } from '../utils/apiError.js'; // Custom error reporter
import { prisma } from '../config/database.js'; // The database manager

/**
 * authenticate: This is a middleware function that checks if a user is logged in.
 * It sits between the user's request and our sensitive data.
 */
export const authenticate = async (req, res, next) => {
  // 1. Look for the "Authorization" header in the request (it usually looks like "Bearer <token>")
  const authHeader = req.headers.authorization;

  // 2. If the header is missing or doesn't start with "Bearer ", the user isn't logged in properly
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authorization header missing or invalid'));
  }

  // 3. Extract the actual token from the "Bearer " header
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the token using our secret key to see if it's valid and not expired
    const decoded = verifyToken(token);
    
    // 5. ANTI-CHEAT: Check if the user is currently blocked in the database
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.sub) }, // "sub" is usually the user's unique ID
      select: { isBlocked: true }, // We only care about the isBlocked flag
    });

    // 6. If they are blocked, reject them with a 403 Forbidden error
    if (user?.isBlocked) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Your account is temporarily blocked due to suspicious activity');
    }

    // 7. Success! Save the user's info into the request object so our controllers can use it
    req.user = decoded; 
    
    // 8. Go to the NEXT thing in the chain (the controller)
    return next();
  } catch (err) {
    console.error('[auth] JWT verification failed:', err?.message || err);
    // 9. If the token was invalid or the user is blocked, send an error
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'));
  }
};
