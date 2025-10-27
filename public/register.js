// Register page JavaScript

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const registration_key = document.getElementById('registration_key').value;
    const username = document.getElementById('username').value;
    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm_password').value;
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous messages
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.style.display = 'none';
    successMessage.textContent = '';
    
    // Validate passwords match
    if (password !== confirm_password) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        errorMessage.textContent = 'Password must be at least 6 characters';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Disable submit button
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                registration_key,
                username, 
                full_name, 
                email: email || null, 
                password 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            successMessage.textContent = 'Account created successfully! Redirecting to login...';
            successMessage.style.display = 'block';
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            // Show error
            errorMessage.textContent = data.message || 'Registration failed';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = 'Network error. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

