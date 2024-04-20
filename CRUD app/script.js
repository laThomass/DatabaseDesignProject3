let displayedUserCount = 5; 

function addUser() {
    const firstName = document.getElementById('userFirstName').value.trim();
    const lastName = document.getElementById('userLastName').value.trim();
    const email = document.getElementById('userEmail').value.trim();

    if (!firstName || !lastName || !email) {
        alert('All fields are required.');
        return;
    }

    fetch('/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email: email })
    })
    .then(response => response.json())
    .then(newUser => {
        if (newUser && newUser._id) {  
            alert('User added successfully!');
            const userElement = `<li onclick="showPortfolio('${newUser._id}'); setCurrentUserId('${newUser._id}');">
                ${newUser.first_name} ${newUser.last_name} - ${newUser.email}
                <button onclick="deleteUser('${newUser._id}', event)" class="delete-btn">Delete</button>
            </li>`;
            document.getElementById('usersList').innerHTML += userElement;
        } else {
            alert('Failed to add user. Please check the data.');
        }
    })
    .catch(error => {
        console.error('Error adding user:', error);
        alert('Failed to add user due to an error: ' + error.message);
    });
}


function getUsers() {
    fetch('/users')
    .then(response => response.json())
    .then(users => {
        const limitedUsers = users.slice(0, displayedUserCount); // Display users up to the current count
        const list = limitedUsers.map(user =>
            `<li onclick="showPortfolio('${user.user_id}'); setCurrentUserId('${user.user_id}');">
                ${user.first_name} ${user.last_name} - ${user.email}
                <button onclick="deleteUser('${user._id}', event)" class="delete-btn">Delete</button>
            </li>`
        ).join('');
        document.getElementById('usersList').innerHTML = `<ul>${list}</ul>`;
    })
    .catch(error => console.error('Error:', error));
}

let currentUserId = null; // Global variable to store the current user ID

function setCurrentUserId(userId) {
    currentUserId = userId; // Set the global variable when a user is clicked
}



function showPortfolio(userId) {
    fetch(`/portfolios/user/${userId}`)
    .then(response => response.json())
    .then(portfolios => {
        const detailsContainer = document.getElementById('portfolioDetails');
        if (portfolios.length > 0) {
            const portfolio = portfolios[0]; // Assuming one portfolio per user for simplicity
            let propertiesDisplay = portfolio.properties.length > 0 ? portfolio.properties.join(', ') : "No properties";
            detailsContainer.innerHTML = `
                <h2>Portfolio Details</h2>
                Name: ${portfolio.name}<br>
                Total Value: ${portfolio.total_value}<br>
                Status: ${portfolio.status ? 'Active' : 'Inactive'}<br>
                Properties: ${propertiesDisplay}
                <button onclick="editPortfolio('${portfolio.portfolio_id}')">Edit Portfolio</button>
            `;
        } else {
            detailsContainer.innerHTML = `
                <p>No portfolio found for this user.</p>
                <button onclick="toggleAddPortfolioForm()">Add Portfolio</button>
            `;
            document.getElementById('editPortfolioForm').style.display = 'none';
        }
        detailsContainer.style.display = 'block';
    })
    .catch(error => {
        console.error('Error fetching portfolios:', error);
        document.getElementById('portfolioDetails').innerHTML = 'Failed to load portfolios.';
        document.getElementById('portfolioDetails').style.display = 'block';
    });
}



function deleteUser(userId, event) {
    event.stopPropagation(); // Prevents the li onclick from triggering when the button is clicked
    if (confirm('Are you sure you want to delete this user?')) {
        fetch(`/users/${userId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                alert('User deleted successfully');
                displayedUserCount = Math.max(displayedUserCount - 1, 5); // Ensure at least 5 users are displayed
                getUsers(); // Refresh the list after deletion
            } else {
                throw new Error('Failed to delete user');
            }
        })
        .catch(error => alert(error.message));
    }
}

function editPortfolio(portfolioId) {
    fetch(`/portfolios/${portfolioId}`) // Ensuring this matches the `portfolio_id` not MongoDB's `_id`
    .then(response => response.json())
    .then(portfolio => {
        document.getElementById('editName').value = portfolio.name;
        document.getElementById('editValue').value = portfolio.total_value;
        document.getElementById('editStatus').checked = portfolio.status;
        document.getElementById('editPortfolioForm').style.display = 'block';
        document.getElementById('saveChangesButton').onclick = function() {
            savePortfolioEdit(portfolio.portfolio_id); // Make sure it's passing `portfolio_id`
        };
    })
    .catch(error => console.error('Error fetching portfolio:', error));
}

function savePortfolioEdit(portfolioId) {
    const updatedName = document.getElementById('editName').value.trim();
    const updatedValue = document.getElementById('editValue').value.trim();
    const updatedStatus = document.getElementById('editStatus').checked;

    // Validation for empty fields
    if (!updatedName || updatedValue === "") {
        alert('Please make sure all fields are filled out.');
        return;
    }

    const apiUrl = `/portfolios/${portfolioId}`;
    console.log("Attempting to update at:", apiUrl); // Debugging output

    fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: updatedName,
            total_value: updatedValue,
            status: updatedStatus
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(updatedPortfolio => {
        alert('Portfolio updated successfully!');
        document.getElementById('portfolioDetails').innerHTML = `
            <h2>Portfolio Details</h2>
            Name: ${updatedName}<br>
            Total Value: ${updatedValue}<br>
            Status: ${updatedStatus ? 'Active' : 'Inactive'}<br>
            <button onclick="editPortfolio('${portfolioId}')">Edit Portfolio</button>
        `;
        document.getElementById('editPortfolioForm').style.display = 'none';
        document.getElementById('portfolioDetails').style.display = 'block';
    })
    .catch(error => {
        console.error('Error updating portfolio:', error);
        alert('Failed to update portfolio: ' + error.message);
    });

}


function addPortfolio() {
    alert('Give 10 lottery points to add a portfolio!')
}


function toggleAddPortfolioForm() {
alert('Give 10 lottery points to add a portfolio!')
}





window.onload = getUsers;
