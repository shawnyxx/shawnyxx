async function renderCalendar(navigationMonth = null, navigationYear = null) {
	let days;

	if (navigationMonth !== null && navigationYear !== null) {
		// Use navigation values
		days = originalDaysPlayed;
		currentMonth = navigationMonth;
		currentYear = navigationYear;
	} else {
		// Initial render
		days = parseInt(document.getElementById("daysPlayed").value);
		if (isNaN(days)) return;

		originalDaysPlayed = days;

		// Hide input container and show calendar navigation
		document.querySelector('.input-container').style.display = "none";
		document.getElementById("calendarNavigation").style.display = "block";
		document.getElementById("calendarHeader").style.display = "grid";

		// Calculate initial date
		const totalDays = days - 1;
		currentYear = Math.floor(totalDays / 365);
		const dayOfYear = totalDays % 365;

		const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		let month = 0;
		let dayOfMonth = dayOfYear + 1;

		for (let i = 0; i < 12; i++) {
			if (dayOfMonth <= daysInMonth[i]) {
				month = i;
				break;
			}
			dayOfMonth -= daysInMonth[i];
		}

		if (dayOfMonth > 31) {
			month = 0;
			dayOfMonth = dayOfMonth - 31;
		}

		currentMonth = month;
	}

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];
	const monthName = monthNames[currentMonth];
	document.getElementById("calendarTitle").textContent = `${monthName} ${currentYear}`;

	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const daysInCurrentMonth = daysInMonth[currentMonth];

	// Calculate the first day of the month
	const totalDaysFromStart = originalDaysPlayed - 1;
	const originalYear = Math.floor(totalDaysFromStart / 365);
	const originalDayOfYear = totalDaysFromStart % 365;

	// Calculate days from original date to current navigation date
	const yearDiff = currentYear - originalYear;
	const monthDiff = currentMonth - getCurrentOriginalMonth(originalDayOfYear);
	const totalMonthDiff = yearDiff * 12 + monthDiff;

	let daysToDifferentMonth = 0;
	for (let i = 0; i < Math.abs(totalMonthDiff); i++) {
		if (totalMonthDiff > 0) {
			// Moving forward
			const targetMonth = (getCurrentOriginalMonth(originalDayOfYear) + i) % 12;
			daysToDifferentMonth += daysInMonth[targetMonth];
		} else {
			// Moving backward
			const targetMonth = (getCurrentOriginalMonth(originalDayOfYear) - i - 1 + 12) % 12;
			daysToDifferentMonth -= daysInMonth[targetMonth];
		}
	}

	const firstDayOfNavigationMonth = totalDaysFromStart + daysToDifferentMonth - (getCurrentOriginalDayOfMonth(originalDayOfYear) - 1);
	const firstDayOfWeek = (firstDayOfNavigationMonth + 6) % 7;

	const calendar = document.getElementById("calendar");
	calendar.innerHTML = "";

	// Add empty cells
	for (let i = 0; i < firstDayOfWeek; i++) {
		calendar.appendChild(document.createElement("div"));
	}

	const data = await Data.loadData();

	// Determine current day if we're viewing the original month
	let currentDayOfMonth = null;
	if (currentYear === originalYear && currentMonth === getCurrentOriginalMonth(originalDayOfYear)) {
		currentDayOfMonth = getCurrentOriginalDayOfMonth(originalDayOfYear);
	}

	for (let day = 1; day <= daysInCurrentMonth; day++) {
		const cell = document.createElement("div");
		cell.className = "day";

		const isCurrentDay = day === currentDayOfMonth;
		if (isCurrentDay) cell.classList.add('current-day');

		cell.innerHTML = `<h4>${day}${isCurrentDay ? ' ⭐' : ''}</h4>`;

		const key = `${currentYear}-${currentMonth}-${day}`;
		if (data.events[key]) {
			data.events[key].slice(0, 2).forEach(event => {
				const preview = document.createElement("div");
				preview.className = "event-preview";
				preview.textContent = event.title.length > 20 ? event.title.slice(0, 20) + '...' : event.title;
				cell.appendChild(preview);
			});
		}

		cell.onclick = () => openPopup(key, `${monthName} ${day}, ${currentYear}`);
		calendar.appendChild(cell);
	}
}

function generateCalendar() {
	const inputContainer = document.getElementById('inputContainer');
	const calendarLoading = document.getElementById('calendarLoading');
	const daysPlayedInput = document.getElementById('daysPlayed');

	if (!daysPlayedInput.value) {
		daysPlayedInput.style.animation = 'shake 0.5s ease-in-out';
		setTimeout(() => {
			daysPlayedInput.style.animation = '';
		}, 500);
		return;
	}

	inputContainer.style.animation = 'slideOutUp 0.5s ease-out forwards';

	setTimeout(() => {
		inputContainer.style.display = 'none';
		calendarLoading.style.display = 'block';
		setTimeout(() => {
			renderCalendar();
			calendarLoading.style.animation = 'fadeOut 0.5s ease-out forwards';
			setTimeout(() => {
				calendarLoading.style.display = 'none';
			}, 500);
		}, 3000);
	}, 500);
}

async function renderCalendar(navigationMonth = null, navigationYear = null) {
	let days;
	if (navigationMonth !== null && navigationYear !== null) {
		days = originalDaysPlayed;
		currentMonth = navigationMonth;
		currentYear = navigationYear;
	} else {
		days = parseInt(document.getElementById("daysPlayed").value);
		if (isNaN(days)) return;
		originalDaysPlayed = days;
		document.querySelector('.input-container').style.display = "none";
		document.getElementById("calendarNavigation").style.display = "block";
		document.getElementById("calendarHeader").style.display = "grid";
		const totalDays = days - 1;
		currentYear = Math.floor(totalDays / 365);
		const dayOfYear = totalDays % 365;
		const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		let month = 0;
		let dayOfMonth = dayOfYear + 1;
		for (let i = 0; i < 12; i++) {
			if (dayOfMonth <= daysInMonth[i]) {
				month = i;
				break;
			}
			dayOfMonth -= daysInMonth[i];
		}
		if (dayOfMonth > 31) {
			month = 0;
			dayOfMonth = dayOfMonth - 31;
		}
		currentMonth = month;
	}
	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];
	const monthName = monthNames[currentMonth];
	document.getElementById("calendarTitle").textContent = `${monthName} ${currentYear}`;
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const daysInCurrentMonth = daysInMonth[currentMonth];
	const totalDaysFromStart = originalDaysPlayed - 1;
	const originalYear = Math.floor(totalDaysFromStart / 365);
	const originalDayOfYear = totalDaysFromStart % 365;
	const yearDiff = currentYear - originalYear;
	const monthDiff = currentMonth - getCurrentOriginalMonth(originalDayOfYear);
	const totalMonthDiff = yearDiff * 12 + monthDiff;
	let daysToDifferentMonth = 0;
	for (let i = 0; i < Math.abs(totalMonthDiff); i++) {
		if (totalMonthDiff > 0) {
			const targetMonth = (getCurrentOriginalMonth(originalDayOfYear) + i) % 12;
			daysToDifferentMonth += daysInMonth[targetMonth];
		} else {
			const targetMonth = (getCurrentOriginalMonth(originalDayOfYear) - i - 1 + 12) % 12;
			daysToDifferentMonth -= daysInMonth[targetMonth];
		}
	}
	const firstDayOfNavigationMonth = totalDaysFromStart + daysToDifferentMonth - (getCurrentOriginalDayOfMonth(originalDayOfYear) - 1);
	const firstDayOfWeek = (firstDayOfNavigationMonth + 6) % 7;
	const calendar = document.getElementById("calendar");
	calendar.innerHTML = "";
	for (let i = 0; i < firstDayOfWeek; i++) {
		calendar.appendChild(document.createElement("div"));
	}
	const data = await Data.loadData();
	let currentDayOfMonth = null;
	if (currentYear === originalYear && currentMonth === getCurrentOriginalMonth(originalDayOfYear)) {
		currentDayOfMonth = getCurrentOriginalDayOfMonth(originalDayOfYear);
	}
	for (let day = 1; day <= daysInCurrentMonth; day++) {
		const cell = document.createElement("div");
		cell.className = "day";
		const isCurrentDay = day === currentDayOfMonth;
		if (isCurrentDay) cell.classList.add('current-day');
		cell.innerHTML = `<h4>${day}${isCurrentDay ? ' ⭐' : ''}</h4>`;
		const key = `${currentYear}-${currentMonth}-${day}`;
		if (data.events[key]) {
			data.events[key].slice(0, 2).forEach(event => {
				const preview = document.createElement("div");
				preview.className = "event-preview";
				preview.textContent = event.title.length > 20 ? event.title.slice(0, 20) + '...' : event.title;
				cell.appendChild(preview);
			});
		}
		cell.onclick = () => openPopup(key, `${monthName} ${day}, ${currentYear}`);
		calendar.appendChild(cell);
	}
}

function getCurrentOriginalMonth(dayOfYear) {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	let month = 0;
	let dayOfMonth = dayOfYear + 1;
	for (let i = 0; i < 12; i++) {
		if (dayOfMonth <= daysInMonth[i]) {
			month = i;
			break;
		}
		dayOfMonth -= daysInMonth[i];
	}
	if (dayOfMonth > 31) {
		month = 0;
	}
	return month;
}

function getCurrentOriginalDayOfMonth(dayOfYear) {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	let dayOfMonth = dayOfYear + 1;
	for (let i = 0; i < 12; i++) {
		if (dayOfMonth <= daysInMonth[i]) {
			break;
		}
		dayOfMonth -= daysInMonth[i];
	}
	if (dayOfMonth > 31) {
		dayOfMonth = dayOfMonth - 31;
	}
	return dayOfMonth;
}

function navigateMonth(direction) {
	if (currentMonth === null || currentYear === null) return;
	let newMonth = currentMonth + direction;
	let newYear = currentYear;
	if (newMonth < 0) {
		newMonth = 11;
		newYear--;
	} else if (newMonth > 11) {
		newMonth = 0;
		newYear++;
	}
	renderCalendar(newMonth, newYear);
}

async function openPopup(key, title) {
	currentDateKey = key;
	document.getElementById("popupContainer").style.display = "block";
	document.getElementById("popupDate").textContent = title;
	document.getElementById("eventForm").style.display = "none";
	document.getElementById("eventDetails").style.display = "none";
	document.getElementById("defaultEventActions").style.display = "block";
	await displayEventsList();
}

async function displayEventsList() {
	const data = await Data.loadData();
	const events = data.events[currentDateKey] || [];
	const eventsList = document.getElementById("popupEventsList");
	eventsList.innerHTML = "";
	events.forEach((event, index) => {
		const eventDiv = document.createElement("div");
		eventDiv.className = "event-item";
		eventDiv.innerHTML = `
		  <h4>${event.title}</h4>
		  <div class="event-meta">By: ${event.author} | ${event.comments?.length || 0} comments</div>
		  <div class="event-description">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</div>
		`;
		eventDiv.onclick = () => showEventDetails(index);
		eventsList.appendChild(eventDiv);
	});
}

async function showEventDetails(index) {
	const data = await Data.loadData();
	const event = data.events[currentDateKey][index];
	currentEventIndex = index;
	document.getElementById("defaultEventActions").style.display = "none";
	document.getElementById("popupEventsList").style.display = "none";
	document.getElementById("eventDetails").style.display = "block";
	const content = document.getElementById("eventDetailsContent");
	content.innerHTML = `
		<div class="event-item">
		  <h4>${event.title}</h4>
		  <div class="event-meta">By: ${event.author}</div>
		  <div class="event-description">${event.description}</div>
		  <div class="event-comments">
			<h5>Comments (${event.comments?.length || 0}):</h5>
			${(event.comments || []).map(comment => `
			  <div class="comment">
				<span class="comment-author">${comment.author}:</span> ${comment.text}
			  </div>
			`).join('')}
		  </div>
		</div>
	  `;
}

function showEventForm() {
	document.getElementById("defaultEventActions").style.display = "none";
	document.getElementById("popupEventsList").style.display = "none";
	document.getElementById("eventForm").style.display = "block";
	document.getElementById("eventTitle").value = "";
	document.getElementById("eventAuthor").value = "";
	document.getElementById("eventDescription").value = "";
	isEditingEvent = false;
}

async function saveEvent() {
	const title = document.getElementById("eventTitle").value.trim();
	const author = document.getElementById("eventAuthor").value.trim();
	const description = document.getElementById("eventDescription").value.trim();
	if (!title || !author || !description) {
		alert("Please fill in all fields");
		return;
	}
	saveAuthorName(author);
	const data = await Data.loadData();
	if (!data.events[currentDateKey]) data.events[currentDateKey] = [];
	const eventData = { title, author, description, comments: [] };
	if (isEditingEvent && currentEventIndex >= 0) {
		eventData.comments = data.events[currentDateKey][currentEventIndex].comments || [];
		data.events[currentDateKey][currentEventIndex] = eventData;
	} else {
		data.events[currentDateKey].push(eventData);
	}
	await Data.saveData(data);
	cancelEventForm();
	await displayEventsList();
	renderCalendar();
}

function cancelEventForm() {
	document.getElementById("eventForm").style.display = "none";
	document.getElementById("defaultEventActions").style.display = "block";
	document.getElementById("popupEventsList").style.display = "block";
	isEditingEvent = false;
	currentEventIndex = -1;
}

async function addComment() {
	const commentText = document.getElementById("newComment").value.trim();
	const commentAuthor = document.getElementById("commentAuthor").value.trim();
	if (!commentText || !commentAuthor) {
		alert("Please enter both comment and your name");
		return;
	}
	const data = await Data.loadData();
	const event = data.events[currentDateKey][currentEventIndex];
	if (!event.comments) event.comments = [];
	event.comments.push({ text: commentText, author: commentAuthor });
	await Data.saveData(data);
	document.getElementById("newComment").value = "";
	document.getElementById("commentAuthor").value = "";
	await showEventDetails(currentEventIndex);
	renderCalendar();
}

async function editEvent() {
	const data = await Data.loadData();
	const event = data.events[currentDateKey][currentEventIndex];
	document.getElementById("eventTitle").value = event.title;
	document.getElementById("eventAuthor").value = event.author;
	document.getElementById("eventDescription").value = event.description;
	document.getElementById("eventDetails").style.display = "none";
	document.getElementById("eventForm").style.display = "block";
	isEditingEvent = true;
}

async function deleteCurrentEvent() {
	if (confirm("Are you sure you want to delete this event?")) {
		const data = await Data.loadData();
		data.events[currentDateKey].splice(currentEventIndex, 1);
		if (data.events[currentDateKey].length === 0) {
			delete data.events[currentDateKey];
		}
		await Data.saveData(data);
		backToEventList();
		renderCalendar();
	}
}

function backToEventList() {
	document.getElementById("eventDetails").style.display = "none";
	document.getElementById("defaultEventActions").style.display = "block";
	document.getElementById("popupEventsList").style.display = "block";
	currentEventIndex = -1;
}

function closePopup() {
	document.getElementById("popupContainer").style.display = "none";
	currentDateKey = '';
	currentEventIndex = -1;
}

function backToEventList() {
    document.getElementById("eventDetails").style.display = "none";
    document.getElementById("defaultEventActions").style.display = "block";
    document.getElementById("popupEventsList").style.display = "block";
    currentEventIndex = -1;
}

function closePopup() {
    document.getElementById("popupContainer").style.display = "none";
    currentDateKey = '';
    currentEventIndex = -1;
}