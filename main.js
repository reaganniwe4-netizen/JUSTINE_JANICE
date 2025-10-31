import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  loadPolls();
  setupSuggestionForm();
  setupSmoothScrolling();
});

function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

async function loadPolls() {
  const pollsContainer = document.getElementById('polls-container');

  try {
    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!polls || polls.length === 0) {
      pollsContainer.innerHTML = '<p class="no-polls">No active polls at the moment. Check back soon!</p>';
      return;
    }

    pollsContainer.innerHTML = '';

    for (const poll of polls) {
      const pollCard = await createPollCard(poll);
      pollsContainer.appendChild(pollCard);
    }
  } catch (error) {
    console.error('Error loading polls:', error);
    pollsContainer.innerHTML = '<p class="error">Failed to load polls. Please try again later.</p>';
  }
}

async function createPollCard(poll) {
  const card = document.createElement('div');
  card.className = 'poll-card';
  card.id = `poll-${poll.id}`;

  const hasVoted = localStorage.getItem(`voted_${poll.id}`);

  const { data: votes, error } = await supabase
    .from('poll_votes')
    .select('option_index')
    .eq('poll_id', poll.id);

  if (error) {
    console.error('Error loading votes:', error);
  }

  const voteCounts = {};
  if (votes) {
    votes.forEach(vote => {
      voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
    });
  }

  const totalVotes = votes ? votes.length : 0;

  let html = `<h3 class="poll-question">${poll.question}</h3>`;

  if (!hasVoted) {
    html += '<form class="poll-form">';
    html += '<ul class="poll-options">';

    poll.options.forEach((option, index) => {
      html += `
        <li class="poll-option">
          <label>
            <input type="radio" name="poll-option" value="${index}" required>
            ${option}
          </label>
        </li>
      `;
    });

    html += '</ul>';
    html += '<button type="submit" class="vote-btn">Submit Vote</button>';
    html += '</form>';
  } else {
    html += '<p style="color: #10b981; font-weight: 600; margin-bottom: 16px;">Thank you for voting!</p>';
    html += createResultsHTML(poll.options, voteCounts, totalVotes);
  }

  card.innerHTML = html;

  if (!hasVoted) {
    const form = card.querySelector('.poll-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleVote(poll.id, form, poll.options, voteCounts, totalVotes);
    });
  }

  return card;
}

function createResultsHTML(options, voteCounts, totalVotes) {
  let html = '<div class="poll-results">';
  html += '<h4>Results</h4>';

  options.forEach((option, index) => {
    const count = voteCounts[index] || 0;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

    html += `
      <div class="result-item">
        <div class="result-label">
          <span>${option}</span>
          <span>${count} vote${count !== 1 ? 's' : ''} (${percentage}%)</span>
        </div>
        <div class="result-bar">
          <div class="result-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

async function handleVote(pollId, form, options, voteCounts, totalVotes) {
  const submitBtn = form.querySelector('.vote-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const selectedOption = form.querySelector('input[name="poll-option"]:checked');

  if (!selectedOption) {
    alert('Please select an option');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Vote';
    return;
  }

  const optionIndex = parseInt(selectedOption.value);

  try {
    const { error } = await supabase
      .from('poll_votes')
      .insert([{
        poll_id: pollId,
        option_index: optionIndex,
        voter_ip: ''
      }]);

    if (error) throw error;

    localStorage.setItem(`voted_${pollId}`, 'true');

    voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + 1;
    totalVotes += 1;

    const pollCard = document.getElementById(`poll-${pollId}`);
    const resultsHTML = '<p style="color: #10b981; font-weight: 600; margin-bottom: 16px;">Thank you for voting!</p>' +
                       createResultsHTML(options, voteCounts, totalVotes);

    pollCard.querySelector('.poll-form').remove();
    pollCard.querySelector('.poll-question').insertAdjacentHTML('afterend', resultsHTML);

  } catch (error) {
    console.error('Error submitting vote:', error);
    alert('Failed to submit vote. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Vote';
  }
}

function setupSuggestionForm() {
  const form = document.getElementById('suggestion-form');
  const statusMessage = document.getElementById('suggestion-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const name = document.getElementById('suggestion-name').value.trim();
    const email = document.getElementById('suggestion-email').value.trim();
    const message = document.getElementById('suggestion-message').value.trim();

    if (!message) {
      showStatus('Please enter your suggestion', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Suggestion';
      return;
    }

    try {
      const { error } = await supabase
        .from('suggestions')
        .insert([{
          name: name || '',
          email: email || '',
          message: message
        }]);

      if (error) throw error;

      showStatus('Thank you! Your suggestion has been submitted successfully.', 'success');
      form.reset();

    } catch (error) {
      console.error('Error submitting suggestion:', error);
      showStatus('Failed to submit suggestion. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Suggestion';
    }
  });
}

function showStatus(message, type) {
  const statusMessage = document.getElementById('suggestion-status');
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 5000);
}
