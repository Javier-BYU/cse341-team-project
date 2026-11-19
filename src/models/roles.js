import Role from './schemas/roles.js';

const getRoleByName = async (name) => Role.findOne({ name: name.toLowerCase() }).lean();

const createRole = async (name) => Role.create({ name: name.toLowerCase() });

const ensureStandardRoles = async () => {
    await Promise.all(['admin', 'user'].map((name) => (
        Role.updateOne(
            { name },
            { $setOnInsert: { name } },
            { upsert: true }
        )
    )));
};

export { createRole, ensureStandardRoles, getRoleByName };
