//NOTE!!!: I could not get my athletic events working. 
//I received help from a friend, however I am not able to understand how they got to that point.
//I went back to try to derive the solution myself with chatgpt. But I could not do it after over an hour
//hence I have one working version and one I worked on myself but could not figure out


const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// const puppeteer = require('puppeteer'); //needed puppeteer to access du athletics page wasn't loading correctly


//working
async function scrapeBulletin() {
    const url = 'https://bulletin.du.edu/undergraduate/majorsminorscoursedescriptions/traditionalbachelorsprogrammajorandminors/computerscience/#coursedescriptionstext';

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        let courses = [];

        $('.courseblock').each((index, element) => {
            const courseTitleText = $(element).find('.courseblocktitle strong').text().trim();

            // Extract course code and title
            const match = courseTitleText.match(/(COMP\s?\d+)\s(.+)/);
            if (!match) return; // Skip if format is unexpected

            const course = match[1]; // e.g., "COMP 3200"
            const title = match[2];  // e.g., "Advanced Data Structures (4 Credits)"

            // Ensure it's an upper-division course (3000-level or higher)
            const courseNumber = parseInt(course.replace(/\D/g, ''), 10);
            if (courseNumber < 3000) return; // Skip lower-division courses

            // Extract prerequisites
            let prerequisitesText = $(element).find('.courseblockdesc').text().trim();
            
            // More robust prerequisite detection
            // let hasPrerequisites = /Prerequisite|Prereq|Corequisite|Co-req|Requires/i.test(prerequisitesText);
            let hasPrerequisites = /Prerequisite|Prereq|Corequisite|Co-req/i.test(prerequisitesText);

            // Only include courses with NO prerequisites
            if (!hasPrerequisites) {
                courses.push({ course, title });
            }
        });

        // Save results to JSON file
        const resultsDir = path.join(__dirname, 'results');
        fs.ensureDirSync(resultsDir);
        fs.writeJsonSync(path.join(resultsDir, 'bulletin.json'), { courses }, { spaces: 2 });

        console.log(`Bulletin data saved. Found ${courses.length} courses without prerequisites.`);
    } catch (error) {
        console.error('Error scraping bulletin:', error);
    }
}


// Replace with the actual URL
const url = 'https://denverpioneers.com/index.aspx';

//WORKING SCRAPE ATHLETICS
async function scrapeAthletics() {
    try {
        // Fetch the HTML of the page
        const { data } = await axios.get(url);

        // Load the HTML into Cheerio
        const $ = cheerio.load(data);

        // Extract the JSON object from the script tag containing "var obj"
        const scriptContent = $('section[aria-labelledby="h2_scoreboard"] script').html();

        // Use regex to match the JSON-like object in the script
        const jsonString = scriptContent.match(/var obj = ({.*?});/s);
        
        if (!jsonString) {
            console.log('Data object not found!');
            return;
        }

        // Parse the JSON object
        const eventData = JSON.parse(jsonString[1]);

        // Extract events
        let events = [];
        eventData.data.forEach(event => {
            const duTeam = event.opponent.name;  // DU team's opponent
            const opponent = event.opponent.name;  // Opponent team
            const date = event.date;  // Event date

            // Push the event data into the array
            events.push({ duTeam, opponent, date });
        });

        // Save the scraped data to a JSON file
        fs.writeFileSync(path.join(__dirname, 'results', 'athletic_events.json'), JSON.stringify({ events }, null, 2));
        console.log('Athletic events data saved.');

    } catch (error) {
        console.error('Error scraping athletics data:', error);
    }
}//working


//NOT WORKING SCRAPE ATHLETICS
async function scrapeAthleticEvents() {
    const url = 'https://denverpioneers.com/index.aspx'; // DU Athletics site
    try {
        const { data } = await axios.get(url); // Fetch HTML of the page
        const $ = cheerio.load(data); // Load HTML into Cheerio

        // Find the script within the section with aria-labelledby="h2_scoreboard"
        const scriptContent = $('section[aria-labelledby="h2_scoreboard"] script').html();

        if (scriptContent && scriptContent.includes('var obj =')) {
            console.log('Found script with event data:');

            // Extract the JSON data using a regular expression
            const match = scriptContent.match(/var obj = ({.*?});/s); // Match the JSON object
            if (match && match[1]) {
                try {
                    const jsonData = JSON.parse(match[1]); // Parse the JSON
                    console.log('Extracted JSON data:', jsonData); // Inspect the extracted data

                    // Check if the jsonData has the expected structure
                    if (jsonData && jsonData.events) {
                        console.log('Found events:', jsonData.events); // Log the events array

                        // Assuming the events are stored in jsonData.events (update accordingly based on the structure)
                        const events = jsonData.events || [];
                        const formattedEvents = events.map(event => ({
                            duTeam: event.duTeam, // Extract DU Team Name
                            opponent: event.opponent, // Extract Opponent Team Name
                            date: event.date // Extract Event Date
                        }));

                        // Output the results
                        const result = { events: formattedEvents };
                        console.log('Formatted events:', result); // Log the formatted result

                        // Save the results to a file
                        fs.writeFileSync('results/athletic_events.json', JSON.stringify(result, null, 2));
                        console.log('Event data saved to results/athletic_events.json');
                    } else {
                        console.log('No events data found in jsonData.');
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            } else {
                console.log('JSON data not found in script.');
            }
        } else {
            console.log('No matching script found.');
        }
        
    } catch (error) {
        console.error('Error fetching or processing event data:', error);
    }
}
scrapeAthleticEvents();
 



// Function to scrape DU Main Calendar for 2025 events
async function scrapeCalendar() {
    const url = 'https://www.du.edu/calendar'; // Update with the actual URL
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    let events = [];
    
    // Select the event cards
    $('a.event-card').each((index, element) => {
        const title = $(element).find('h3').text().trim(); // Event Title
        const date = $(element).find('p').first().text().trim(); // Event Date
        const time = $(element).find('p').eq(1).text().trim().replace(' - ', ' to '); // Event Time
        const description = ''; // You might need to visit each event page for descriptions
        
        let eventData = { title, date };
        if (time) eventData.time = time;
        if (description) eventData.description = description;
        
        events.push(eventData);
    });
    
    // Save the events data in JSON format
    fs.writeJsonSync(path.join('results', 'calendar_events.json'), { events }, { spaces: 2 });
    console.log('Calendar events data saved.');
}/// WORKING

// Run all scrapers
(async () => {
    // await scrapeBulletin(); //working
    // await scrapeAthletics();
    // await scrapeCalendar();
})();

