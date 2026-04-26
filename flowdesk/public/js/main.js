document.addEventListener('DOMContentLoaded', () => {

  // 1. Theme toggle
  const themeToggles = document.querySelectorAll('.theme-toggle');
  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
      fetch('/settings/theme?mode=' + theme);
      localStorage.setItem('theme', theme);
      
      // Update toggle icon
      toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  });

  // 2. Kanban view / list view toggle (Logic already initialized inline in tasks/index.ejs, but ensuring event listeners work)
  const kanbanBtn = document.getElementById('kanbanViewBtn');
  const listBtn = document.getElementById('listViewBtn');
  const kanbanBoard = document.getElementById('kanbanBoard');
  const listView = document.getElementById('listView');

  if (kanbanBtn && listBtn) {
    kanbanBtn.addEventListener('click', () => {
      kanbanBoard.style.display = 'flex';
      listView.style.display = 'none';
      kanbanBtn.classList.add('active');
      listBtn.classList.remove('active');
      localStorage.setItem('flowdesk_task_view', 'kanban');
    });

    listBtn.addEventListener('click', () => {
      kanbanBoard.style.display = 'none';
      listView.style.display = 'block';
      listBtn.classList.add('active');
      kanbanBtn.classList.remove('active');
      localStorage.setItem('flowdesk_task_view', 'list');
    });
  }

  // 3. Drag and drop for kanban
  const tasks = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.kanban-column-body');

  tasks.forEach(task => {
    task.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.dataset.id);
      setTimeout(() => task.style.opacity = '0.5', 0);
    });

    task.addEventListener('dragend', () => {
      task.style.opacity = '1';
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.style.background = 'rgba(0,0,0,0.02)';
      if (document.body.classList.contains('dark-mode')) {
        column.style.background = 'rgba(255,255,255,0.05)';
      }
    });

    column.addEventListener('dragleave', () => {
      column.style.background = 'transparent';
    });

    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.style.background = 'transparent';
      
      const taskId = e.dataTransfer.getData('text/plain');
      const draggedTask = document.querySelector(`.task-card[data-id="${taskId}"]`);
      const newStatus = column.parentElement.dataset.status;
      
      // Avoid unnecessary API call if status is same
      const currentStatusBadge = draggedTask.querySelector('.badge');
      if (currentStatusBadge && currentStatusBadge.textContent.trim() === newStatus) return;

      if (draggedTask && newStatus) {
        // Optimistic UI Update
        column.appendChild(draggedTask);
        
        // Update badges
        if (currentStatusBadge) {
          currentStatusBadge.textContent = newStatus;
          currentStatusBadge.className = `badge badge-${newStatus === 'done' ? 'success' : (newStatus === 'in-progress' ? 'warning' : 'primary')}`;
        }

        // Update column counts
        document.querySelectorAll('.kanban-column').forEach(col => {
            const count = col.querySelectorAll('.task-card').length;
            const badge = col.querySelector('.kanban-column-header .badge');
            if (badge) badge.textContent = count;
        });

        try {
          const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          
          if (!res.ok) throw new Error('Update failed');
          
          if (typeof io !== 'undefined' && window.socket) {
              window.socket.emit('task:statusChange', { taskId, status: newStatus });
          }
        } catch (error) {
          console.error('Failed to update status', error);
          // Reload to revert if failed
          window.location.reload();
        }
      }
    });
  });

  // 4. Flash message auto-dismiss
  setTimeout(() => {
    document.querySelectorAll('.toast').forEach(toast => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
  }, 4000);

  // 5. Delete confirmation (using method-override forms)
  document.querySelectorAll('form').forEach(form => {
    if (form.action.includes('?_method=DELETE')) {
        form.addEventListener('submit', (e) => {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    }
  });

  // 6. Notifications bell dummy functionality (Assuming API exists, mock structure)
  const bellBtns = document.querySelectorAll('.bell-btn');
  bellBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        // Toggle dropdown logic could go here
        alert('Notifications feature ready to be hooked to /api/v1/notifications');
    });
  });

  // 8. Comment form on task detail
  const commentForm = document.querySelector('.comment-box');
  const commentsList = document.querySelector('.comments-list');
  const commentInput = document.getElementById('commentInput');

  if (commentForm && commentsList) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = commentInput.value.trim();
      if (!text) return;

      const taskId = window.location.pathname.split('/').pop();
      
      try {
        const res = await fetch(`/api/v1/tasks/${taskId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (res.ok) {
          const data = await res.json();
          // Assuming data.data is the populated comment
          const comment = data.data; 
          
          const commentDiv = document.createElement('div');
          commentDiv.className = 'comment-item';
          // Render simple structure
          commentDiv.innerHTML = `
            <div class="avatar">U</div>
            <div>
                <div style="display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px;">
                    <strong>You</strong>
                    <span style="font-size: 12px; color: var(--text-muted);">Just now</span>
                </div>
                <p style="color: var(--text-secondary);">${text}</p>
            </div>
          `;
          
          const indicator = document.getElementById('typing-indicator');
          commentsList.insertBefore(commentDiv, indicator);
          
          commentInput.value = '';
          
          // Stop typing emission
          if (typeof io !== 'undefined' && window.socket) {
              window.socket.emit('typing:stop', taskId);
          }
        }
      } catch (err) {
        console.error('Failed to post comment', err);
      }
    });
  }

  // 10. Online users management
  window.onlineUsers = {};
  
  // Custom global function for socket client to call
  window.updateOnlineStatus = (userId, status) => {
      if (status === 'online') {
          window.onlineUsers[userId] = true;
      } else {
          delete window.onlineUsers[userId];
      }
      
      // Find all avatars and add/remove dot
      // (This requires avatars to have data-user-id attribute, assuming simplistic approach for now)
      document.querySelectorAll('.avatar[data-user-id]').forEach(avatar => {
          const id = avatar.dataset.userId;
          let dot = avatar.parentElement.querySelector('.online-dot');
          
          if (window.onlineUsers[id]) {
              if (!dot) {
                  avatar.parentElement.style.position = 'relative';
                  dot = document.createElement('div');
                  dot.className = 'online-dot';
                  dot.style.position = 'absolute';
                  dot.style.bottom = '0';
                  dot.style.right = '0';
                  avatar.parentElement.appendChild(dot);
              }
          } else {
              if (dot) dot.remove();
          }
      });
  };

});
