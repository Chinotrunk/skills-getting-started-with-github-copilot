document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear activity select (preserve placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build basic activity markup (participants list will be populated via DOM)
        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list"></ul>
            <p class="no-participants hidden">No participants yet</p>
          </div>
        `;

        // Append card first
        activitiesList.appendChild(activityCard);

        // Populate participants as DOM nodes so we can attach data and behavior
        const participantsListEl = activityCard.querySelector('.participants-list');
        const noParticipantsEl = activityCard.querySelector('.no-participants');

        if (Array.isArray(details.participants) && details.participants.length > 0) {
          noParticipantsEl.classList.add('hidden');
          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = p;

            const btn = document.createElement('button');
            btn.className = 'remove-participant';
            btn.type = 'button';
            btn.title = `Remove ${p}`;
            // store activity name and email for handler
            btn.dataset.activity = name;
            btn.dataset.email = p;
            btn.textContent = '✖';

            li.appendChild(span);
            li.appendChild(btn);
            participantsListEl.appendChild(li);
          });
        } else {
          noParticipantsEl.classList.remove('hidden');
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Event delegation for remove buttons
  activitiesList.addEventListener('click', async (event) => {
    const btn = event.target.closest('.remove-participant');
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    // Disable button to prevent duplicate clicks
    btn.disabled = true;
    btn.textContent = '...';

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await resp.json().catch(() => ({}));

      if (resp.ok) {
        // Refresh activities to keep UI consistent
        fetchActivities();
      } else {
        console.error('Failed to remove participant', result);
        // re-enable and restore
        btn.disabled = false;
        btn.textContent = '✖';
        alert(result.detail || result.message || 'Failed to remove participant');
      }
    } catch (err) {
      console.error('Error removing participant', err);
      btn.disabled = false;
      btn.textContent = '✖';
      alert('Failed to remove participant. Please try again.');
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Simple HTML escaper for inserted strings
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
