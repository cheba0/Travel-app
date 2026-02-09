
        // Инициализация данных
        window.travelData = {
            id: '<%= travel.id %>',
            name: '<%= travel.name %>',
            currency: '<%= travel.currency || "RUB" %>',
            participants: <%- participantsJSON || '[]' %>,
            expenses: <%- expensesJSON || '[]' %>,
            userId: '<%= userId %>'
        };

        // Подсчет общей суммы
        document.addEventListener('DOMContentLoaded', function() {
            const total = window.travelData.expenses.reduce((sum, expense) => {
                return sum + parseFloat(expense.amount || 0);
            }, 0);
            
            document.getElementById('totalAmount').textContent = 
                `Всего: ${total.toFixed(2)} ${window.travelData.currency}`;
        });

        // Функции для приглашения участников
        let inviteModalOpen = false;

        function inviteParticipants() {
            document.getElementById('inviteModal').style.display = 'block';
            inviteModalOpen = true;
            loadCurrentParticipants();
        }

        function closeInviteModal() {
            document.getElementById('inviteModal').style.display = 'none';
            inviteModalOpen = false;
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('userSearch').value = '';
        }

        async function loadCurrentParticipants() {
            try {
                const response = await fetch(`/api/trips/${window.travelData.id}/participants`);
                const data = await response.json();
                
                const container = document.getElementById('currentParticipants');
                if (data.success && data.participants.length > 0) {
                    let html = '<ul style="list-style: none; padding: 0;">';
                    data.participants.forEach(participant => {
                        html += `<li style="padding: 5px 0;">👤 ${participant.username} (${participant.email})</li>`;
                    });
                    html += '</ul>';
                    container.innerHTML = html;
                } else {
                    container.innerHTML = '<p>Участников пока нет</p>';
                }
            } catch (error) {
                console.error('Ошибка загрузки участников:', error);
            }
        }

        // Поиск пользователей
        let searchTimeout;
        document.getElementById('userSearch').addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => searchUsers(e.target.value), 500);
        });

        async function searchUsers(query) {
            if (!query || query.length < 2) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }

            try {
                const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                const resultsDiv = document.getElementById('searchResults');
                resultsDiv.innerHTML = '';
                
                if (data.success && data.users.length > 0) {
                    data.users.forEach(user => {
                        const userDiv = document.createElement('div');
                        userDiv.style.padding = '10px';
                        userDiv.style.borderBottom = '1px solid #eee';
                        userDiv.style.display = 'flex';
                        userDiv.style.justifyContent = 'space-between';
                        userDiv.style.alignItems = 'center';
                        
                        userDiv.innerHTML = `
                            <div>
                                <strong>${user.username}</strong><br>
                                <small>${user.email}</small>
                            </div>
                            <button onclick="inviteUser(${user.id}, '${user.username}')" 
                                    style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                                Пригласить
                            </button>
                        `;
                        resultsDiv.appendChild(userDiv);
                    });
                } else {
                    resultsDiv.innerHTML = '<p style="color: #666; padding: 10px;">Пользователи не найдены</p>';
                }
            } catch (error) {
                console.error('Ошибка поиска:', error);
            }
        }

        // Пригласить пользователя
        async function inviteUser(userId, username) {
            try {
                const response = await fetch(`/api/trips/${window.travelData.id}/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`✅ Пользователь ${username} приглашен!`);
                    loadCurrentParticipants(); // Обновляем список
                    document.getElementById('searchResults').innerHTML = '';
                    document.getElementById('userSearch').value = '';
                } else {
                    alert(`❌ ${data.message || 'Ошибка приглашения'}`);
                }
            } catch (error) {
                console.error('Ошибка приглашения:', error);
                alert('❌ Ошибка приглашения');
            }
        }

        // Закрытие модального окна по клику вне его
        document.getElementById('inviteModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeInviteModal();
            }
        });

        // Вешаем обработчик на кнопку Share
        document.addEventListener('DOMContentLoaded', function() {
            const shareButton = document.querySelector('.participants_share');
            if (shareButton) {
                shareButton.addEventListener('click', inviteParticipants);
            }
            
            // Обработчик для всего блока участников
            const participantsBlock = document.querySelector('.participants_block');
            if (participantsBlock) {
                participantsBlock.addEventListener('click', function(e) {
                    if (e.target !== shareButton && !shareButton.contains(e.target)) {
                        inviteParticipants();
                    }
                });
            }
        });

        // CSS для аватаров участников
        const style = document.createElement('style');
        style.textContent = `
            .participant-avatar {
                display: inline-block;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                text-align: center;
                line-height: 32px;
                margin-right: -10px;
                border: 2px solid white;
            }
            .participant-avatar.more {
                background: #6c757d;
            }
        `;
        document.head.appendChild(style);

    

    // Функция для открытия формы редактирования
    function openEditForm(travelId) {
        // Вариант 1: Используем существующий маршрут showForm
        window.location.href = '/travel/' + travelId + '/form';
        
        // Вариант 2: Если у вас отдельный маршрут для редактирования
        // window.location.href = '/travel/' + travelId + '/edit';
    }
