function getWeekDates(weekStartDate) {
    const startDate = new Date(weekStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    console.log("Server time zone offset (minutes):", new Date().getTimezoneOffset());
    console.log("startDate param:", weekStartDate);
    console.log("startDate:", startDate.toISOString(), startDate.toString());
    console.log("endDate:", endDate.toISOString(), endDate.toString());
    
    for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startDate);
        dayStart.setDate(dayStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        console.log(`Day ${i+1}: ${dayStart.toISOString()}`);
    }
}
getWeekDates('2026-06-01');
