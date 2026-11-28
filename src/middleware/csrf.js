import { randomBytes, timingSafeEqual } from 'crypto';

const issueCsrfToken = (req, res) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(32).toString('hex');
    }

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ csrfToken: req.session.csrfToken });
};

const requireCsrfToken = (req, res, next) => {
    const submittedToken = req.get('X-CSRF-Token');
    const sessionToken = req.session?.csrfToken;

    if (
        typeof submittedToken !== 'string' ||
        typeof sessionToken !== 'string'
    ) {
        return res.status(403).json({ error: 'CSRF token is required.' });
    }

    const submittedBuffer = Buffer.from(submittedToken);
    const sessionBuffer = Buffer.from(sessionToken);

    if (
        submittedBuffer.length !== sessionBuffer.length ||
        !timingSafeEqual(submittedBuffer, sessionBuffer)
    ) {
        return res.status(403).json({ error: 'Invalid CSRF token.' });
    }

    return next();
};

export { issueCsrfToken, requireCsrfToken };
