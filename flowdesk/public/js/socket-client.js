function getCookieValue(name) {
  const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return match ? match.pop() : ''
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  
  if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
  if (type === 'warning') toast.style.borderLeftColor = 'var(--warning)';
  if (type === 'success') toast.style.borderLeftColor = 'var(--secondary)';
  if (type === 'info') toast.style.borderLeftColor = 'var(--primary)';

  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000)
}

const token = getCookieValue('jwt_token');

if (token && typeof io !== 'undefined') {
  const socket = io({
    withCredentials: true,
    auth: { token }
  });

  window.socket = socket;

  // 1. Connection handling
  socket.on('connect', () => console.log('⚡ FlowDesk live'));
  socket.on('disconnect', () => showToast('Connection lost. Reconnecting...', 'warning'));
  socket.on('connect_error', (err) => console.error('Socket auth failed:', err.message));

  // 2. Join rooms on page load
  document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    
    if (pathParts[0] === 'projects' && pathParts[1] && pathParts[1] !== 'new') {
      socket.emit('join:project', pathParts[1]);
    }
    
    if (pathParts[0] === 'tasks' && pathParts[1] && pathParts[1] !== 'new' && pathParts[1] !== 'edit') {
      socket.emit('join:task', pathParts[1]);
    }
  });

  // 3. task:updated event
  socket.on('task:updated', (task) => {
    const card = document.querySelector(`.task-card[data-id="${task._id}"]`);
    if (card) {
      const currentStatus = card.parentElement.dataset.status;
      
      if (currentStatus !== task.status) {
        const targetColumn = document.querySelector(`.kanban-column[data-status="${task.status}"] .kanban-column-body`);
        if (targetColumn) {
          targetColumn.appendChild(card);
          
          document.querySelectorAll('.kanban-column').forEach(col => {
            const count = col.querySelectorAll('.task-card').length;
            const badge = col.querySelector('.kanban-column-header .badge');
            if (badge) badge.textContent = count;
          });
        }
      }

      const badge = card.querySelector('.badge');
      if (badge) {
        badge.textContent = task.status;
        badge.className = `badge badge-${task.status === 'done' ? 'success' : (task.status === 'in-progress' ? 'warning' : 'primary')}`;
      }

      card.style.transition = 'box-shadow 0.3s, transform 0.3s';
      card.style.boxShadow = '0 0 0 2px var(--primary)';
      card.style.transform = 'translateY(-2px)';
      setTimeout(() => {
        card.style.boxShadow = 'var(--shadow)';
        card.style.transform = 'translateY(0)';
      }, 1000);
    }
  });

  // 4. task:created event
  socket.on('task:created', (task) => {
    showToast(`New task created: ${task.title}`, 'success');
    
    const targetColumn = document.querySelector(`.kanban-column[data-status="${task.status || 'todo'}"] .kanban-column-body`);
    if (targetColumn) {
      const card = document.createElement('div');
      card.className = `task-card priority-${task.priority || 'medium'}`;
      card.dataset.id = task._id;
      card.setAttribute('draggable', 'true');
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h4 style="font-size: 15px; margin: 0; color: var(--text-primary); line-height: 1.4;">${task.title}</h4>
            <div class="badge badge-${task.status === 'done' ? 'success' : (task.status === 'in-progress' ? 'warning' : 'primary')}">
                ${task.status || 'todo'}
            </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            ${task.project && task.project.name ? task.project.name : 'No Project'}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px;">
            <div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Due Date'}
            </div>
            <div class="avatar" style="width: 24px; height: 24px; font-size: 10px;">${task.assignedTo && task.assignedTo.name ? task.assignedTo.name.charAt(0) : '?'}</div>
        </div>
      `;
      
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        setTimeout(() => card.style.opacity = '0.5', 0);
      });
      card.addEventListener('dragend', () => card.style.opacity = '1');

      targetColumn.insertBefore(card, targetColumn.firstChild);
      
      const badge = targetColumn.parentElement.querySelector('.kanban-column-header .badge');
      if (badge) badge.textContent = parseInt(badge.textContent) + 1;
    }
  });

  // 5. notification:new event
  socket.on('notification:new', (notification) => {
    showToast(notification.message, 'info');
    const bellBtn = document.querySelector('.bell-btn');
    if (bellBtn) {
      let badge = bellBtn.querySelector('.badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'badge badge-danger';
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-5px';
        badge.style.fontSize = '10px';
        badge.style.padding = '2px 4px';
        bellBtn.appendChild(badge);
      }
      badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  });

  // 6. user:online and user:offline
  socket.on('user:online', (user) => {
    if (window.updateOnlineStatus) window.updateOnlineStatus(user.userId, 'online');
  });

  socket.on('user:offline', (userId) => {
    if (window.updateOnlineStatus) window.updateOnlineStatus(userId, 'offline');
  });

  // 7. comment:added event
  socket.on('comment:added', (data) => {
    const { taskId, comment } = data;
    const currentTaskId = window.location.pathname.split('/').pop();
    
    if (currentTaskId === taskId) {
      const commentsList = document.querySelector('.comments-list');
      if (commentsList) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            <div class="avatar">${comment.user && comment.user.name ? comment.user.name.charAt(0) : 'U'}</div>
            <div>
                <div style="display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px;">
                    <strong>${comment.user && comment.user.name ? comment.user.name : 'Unknown'}</strong>
                    <span style="font-size: 12px; color: var(--text-muted);">Just now</span>
                </div>
                <p style="color: var(--text-secondary);">${comment.text}</p>
            </div>
        `;
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            commentsList.insertBefore(commentDiv, indicator);
        } else {
            commentsList.appendChild(commentDiv);
        }
        commentDiv.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // 8. typing:start and typing:stop
  socket.on('typing:start', (data) => {
      const currentTaskId = window.location.pathname.split('/').pop();
      if (currentTaskId === data.taskId) {
          const indicator = document.getElementById('typing-indicator');
          if (indicator) {
              indicator.style.display = 'block';
              indicator.textContent = `${data.userName || 'Someone'} is typing...`;
          }
      }
  });

  socket.on('typing:stop', (data) => {
      const currentTaskId = window.location.pathname.split('/').pop();
      if (currentTaskId === data.taskId) {
          const indicator = document.getElementById('typing-indicator');
          if (indicator) {
              indicator.style.display = 'none';
          }
      }
  });
}
