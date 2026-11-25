
const hookUserAdmin = () => {
    const usersList = document.getElementById('users-list');
    const loadingEl = document.getElementById('users-loading');
    const errorEl = document.getElementById('users-error');
    const emptyEl = document.getElementById('users-empty');
    const statusEl = document.getElementById('users-status');
    const roleFilter = document.getElementById('users-role-filter');
    const searchInput = document.getElementById('users-search');
    const previousButton = document.getElementById('users-previous');
    const nextButton = document.getElementById('users-next');
    const pageIndicator = document.getElementById('users-page-indicator');

    const editSection = document.getElementById('user-edit-section');
    const editForm = document.getElementById('user-edit-form');
    const userIdInput = document.getElementById('edit-user-id');
    const displayNameInput = document.getElementById('edit-display-name');
    const usernameInput = document.getElementById('edit-username');
    const emailInput = document.getElementById('edit-email');
    const passwordInput = document.getElementById('edit-password');
    const cancelEditButton = document.getElementById('cancel-edit');

    if (!usersList || !editForm) {
        return;
    }

    let users = [];
    let currentPage = 1;
    let totalPages = 1;
    let latestRequest = 0;

    // Display a message to the user.
    const showStatus = (message) => {
        statusEl.textContent = message;
    };

    // Create and display one user account.
    const createUserItem = (user) => {
        const userId = user._id || user.id;
        const item = document.createElement('li');
        const heading = document.createElement('h3');
        const details = document.createElement('p');
        const role = typeof user.role === 'object'
            ? user.role?.name
            : user.role;

        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');

        heading.textContent = user.displayName;
        details.textContent =
            `Username: ${user.username} | Email: ${user.email} | Role: ${role || 'Unknown'}`;

        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
            openEditForm(user);
        });

        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            deleteUser(userId);
        });

        item.append(heading, details, editButton, deleteButton);

        return item;
    };

    // Render all users returned by the API.
    const renderUsers = () => {
        const fragment = document.createDocumentFragment();

        users.forEach((user) => {
            fragment.append(createUserItem(user));
        });

        usersList.replaceChildren(fragment);
        emptyEl.hidden = users.length > 0;
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
        previousButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;
    };

    // Load the current filtered page of user accounts from the API.
    const loadUsers = async (clearStatus = true) => {
        const requestId = ++latestRequest;
        loadingEl.hidden = false;
        errorEl.hidden = true;

        if (clearStatus) {
            showStatus('');
        }

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: '10'
            });

            if (roleFilter.value) {
                params.set('role', roleFilter.value);
            }

            if (searchInput.value) {
                params.set('search', searchInput.value);
            }

            const response = await fetch(`/api/users?${params.toString()}`);

            if (!response.ok) {
                throw new Error(
                    `Request failed with status ${response.status}.`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data.users)) {
                throw new Error('The users response is invalid.');
            }

            if (requestId !== latestRequest) {
                return;
            }

            if (
                Number.isInteger(data.totalPages) &&
                currentPage > data.totalPages
            ) {
                currentPage = data.totalPages;
                await loadUsers(false);
                return;
            }

            users = data.users;
            currentPage = data.page;
            totalPages = data.totalPages;
            renderUsers();
        } catch (error) {
            if (requestId !== latestRequest) {
                return;
            }

            console.error('Unable to load users:', error);
            errorEl.hidden = false;
            usersList.replaceChildren();
            emptyEl.hidden = true;
        } finally {
            if (requestId === latestRequest) {
                loadingEl.hidden = true;
            }
        }
    };

    // Open the edit form and populate it with the selected user.
    const openEditForm = (user) => {
        userIdInput.value = user._id || user.id;
        displayNameInput.value = user.displayName;
        usernameInput.value = user.username;
        emailInput.value = user.email;
        passwordInput.value = '';

        editSection.hidden = false;
        editSection.scrollIntoView({ behavior: 'smooth' });
        displayNameInput.focus();

        showStatus(`Editing ${user.displayName}.`);
    };

    // Close and reset the edit form.
    const closeEditForm = () => {
        editForm.reset();
        editSection.hidden = true;
    };

    // Update a user account through the API.
    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const userId = userIdInput.value;

        const updatedUser = {
            displayName: displayNameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim()
        };

        if (passwordInput.value.trim()) {
            updatedUser.password = passwordInput.value;
        }

        try {
            const response = await fetch(
                `/api/users/${encodeURIComponent(userId)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedUser)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unable to update user.');
            }

            closeEditForm();

            await loadUsers(false);

            showStatus(data.message || 'User updated successfully.');
        } catch (error) {
            console.error('Unable to update user:', error);
            showStatus(error.message);
        }
    });

    // Delete a user account through the API.
    const deleteUser = async (userId) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this user account?'
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `/api/users/${encodeURIComponent(userId)}`,
                {
                    method: 'DELETE'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unable to delete user.');
            }

            closeEditForm();

            await loadUsers(false);

            showStatus(data.message || 'User deleted successfully.');
        } catch (error) {
            console.error('Unable to delete user:', error);
            showStatus(error.message);
        }
    };

    // Cancel editing without saving changes.
    cancelEditButton.addEventListener('click', () => {
        closeEditForm();
        showStatus('Editing cancelled.');
    });

    roleFilter.addEventListener('change', () => {
        currentPage = 1;
        loadUsers();
    });

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        loadUsers();
    });

    previousButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            loadUsers();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            loadUsers();
        }
    });

    // Load users when the page is initialized.
    loadUsers();
};

document.addEventListener('DOMContentLoaded', hookUserAdmin);
