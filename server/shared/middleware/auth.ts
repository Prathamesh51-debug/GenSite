import { Request, Response ,NextFunction} from 'express'
import { auth } from '../lib/auth.js'
import { fromNodeHeaders } from 'better-auth/node'


export const protect = async (req: Request, res:Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        })

        if(!session || !session?.user){
            return res.status(401).json({message: 'Unauthorized user'})
        }

        req.userId = session.user.id;

        next();
    } catch (error: any) {
        // Runs on every unauthenticated request (bots, expired sessions). Log only
        // the message server-side, and never echo internal error detail to the client.
        console.error('Auth check failed:', error?.message);
        res.status(401).json({ message: 'Unauthorized' });
    }

}