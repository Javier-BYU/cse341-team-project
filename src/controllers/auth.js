import { createUser, getUserByIdentifier } from '../models/users.js';
import { verifyPassword } from '../includes/password.js';

const registerPage = (req, res) => res.render('auth/register', {
    title: 'Register',
    error: null,
    values: {}
});

const registerUser = async (req, res) => {
    const { displayName, username, email, password, confirmPassword } = req.body;

    if (!displayName || !username || !email || !password || password !== confirmPassword) {
        return res.status(400).render('auth/register', {
            title: 'Register',
            error: 'Please complete every field and make sure the passwords match.',
            values: { displayName, username, email }
        });
    }

    try {
        await createUser({ displayName, username, email, password });
        return res.redirect('/login?registered=1');
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).render('auth/register', {
                title: 'Register',
                error: 'That username or email is already in use.',
                values: { displayName, username, email }
            });
        }

        throw error;
    }
};

const loginPage = (req, res) => res.render('auth/login', {
    title: 'Log in',
    error: null
});

const loginUser = async (req, res) => {
    const { identifier, password } = req.body;
    const user = identifier ? await getUserByIdentifier(identifier) : null;
    const validPassword = user ? await verifyPassword(password || '', user.passwordHash) : false;

    if (!user || !validPassword) {
        return res.status(401).render('auth/login', {
            title: 'Log in',
            error: 'Invalid username/email or password.'
        });
    }

    req.session.user = {
        id: user._id.toString(),
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        role: user.role.name
    };

    return res.redirect('/admin');
};

const logoutUser = (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie('connect.sid');
        return res.redirect('/');
    });
};

const adminPage = (req, res) => res.render('admin', {
    title: 'Admin Dashboard'
});

export {
    adminPage,
    loginPage,
    loginUser,
    logoutUser,
    registerPage,
    registerUser
};
