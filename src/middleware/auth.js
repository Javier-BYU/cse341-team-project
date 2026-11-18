const isAuthenticated = (req) => Boolean(req.session?.user);

const requireApiLogin = (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    return next();
};

const requirePageLogin = (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.redirect('/login');
    }

    return next();
};

const requireApiRole = (role) => (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.session.user.role !== role) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    return next();
};

const requirePageRole = (role) => (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.redirect('/login');
    }

    if (req.session.user.role !== role) {
        return res.redirect('/403');
    }

    return next();
};

export {
    requireApiLogin,
    requireApiRole,
    requirePageLogin,
    requirePageRole
};
