import fs from "fs";
import shell from "shelljs";
import fetch from "node-fetch";
import "dotenv/config";

// Gathers needed git commands for bash to execute per provided contribution data.
const getCommand = (contribution) => {
  return `GIT_AUTHOR_DATE="${contribution.date}T12:00:00" GIT_COMMITTER_DATE="${contribution.date}T12:00:00" git commit --allow-empty -m "Rewriting History!" > /dev/null\n`.repeat(
    contribution.count
  );
};

export default async (input) => {
  var query = `
    query { 
      user(login: "${input.username}") {
        contributionsCollection(from: "${input.year}-01-01T00:00:00", to: "${input.year}-12-31T23:59:59") {
          contributionCalendar {
            weeks {
              contributionDays {
                date 
                contributionCount
              }
            }
          }
        }
      }
    }`;
  
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({query}),
    headers: {
      'Authorization': `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
    }
  })

  const json = await response.json();
  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;

  let filteredDays = [];
  weeks.forEach((week) => {
    week.contributionDays.forEach((day) => {
      if (day.contributionCount == 0) return;

      filteredDays.push({
        date: day.date,
        count: day.contributionCount,
      });
    })
  });

  const script = filteredDays
    .map((contribution) => getCommand(contribution))
    .join("\n")
    .concat("git pull origin main\n", "git push -f origin main");

  fs.writeFile("script.sh", script, () => {
    console.log("\nFile was created successfully.");

    if (input.execute) {
      console.log("This might take a moment!\n");
      shell.exec("sh ./script.sh");
    }
  });
};
