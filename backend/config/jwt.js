// Single source of truth for the JWT signing secret.
//
// Previously authController and authMiddleware each fell back to the literal
// string 'secret_key_savecircle'. That value is in the public repository, so if
// a deployment forgot to set JWT_SECRET anyone could forge a valid session with
// it. Centralising it here means we can refuse to silently ship that default.
import crypto from 'crypto';

const INSECURE_DEFAULT = 'secret_key_savecircle';

const resolveSecret = () => {
    const configured = process.env.JWT_SECRET;
    if (configured && configured !== INSECURE_DEFAULT) return configured;

    // No usable secret configured. In production, generate a strong random one
    // for this process. Sessions do not survive a restart, but the alternative
    // (a publicly-known constant) lets anyone mint an admin token — far worse.
    if (process.env.NODE_ENV === 'production') {
        console.error(
            'JWT_SECRET is not set. Generated a random secret for this process.\n' +
            '  Existing sessions will be invalidated on every restart.\n' +
            '  Set JWT_SECRET in the environment to keep sessions across deploys.'
        );
        return crypto.randomBytes(48).toString('hex');
    }

    // Local/desktop runs keep a stable secret so developer sessions persist.
    console.warn('JWT_SECRET is not set — using the local development default.');
    return INSECURE_DEFAULT;
};

export const JWT_SECRET = resolveSecret();

export default JWT_SECRET;
