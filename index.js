#!/usr/bin/env node

import { execSync } from "child_process";
import select from "@inquirer/select";
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

/**
 * Git profiles for each GitHub account.
 * These are used to automatically update global Git config
 */
const gitProfiles = {
	SohamGanmote: {
		name: "SohamGanmote",
		email: "sohamganmote@gmail.com",
	},
};

program
	.name("ghswitch")
	.description(chalk.cyan("🚀 Switch GitHub accounts quickly and easily!"))
	.action(async () => {
		try {
			const output = execSync("gh auth status --show-token", {
				encoding: "utf-8",
			});

			const blocks = output
				.trim()
				.split("✓ Logged in to github.com account")
				.filter(Boolean);

			const accounts = blocks
				.map((block) => {
					const nameMatch = block.match(/(\w+)\s*\(keyring\)/);
					const activeMatch = block.match(/Active account:\s*(true|false)/i);
					const tokenMatch = block.match(/Token:\s*(.*)/);
					const scopesMatch = block.match(/Token scopes:\s*'(.*)'/);

					return {
						name: nameMatch ? nameMatch[1].trim() : null,
						active: activeMatch ? activeMatch[1].trim() === "true" : false,
						token: tokenMatch ? tokenMatch[1].trim() : "",
						tokenScopes: scopesMatch ? scopesMatch[1].split("', '") : [],
					};
				})
				.filter((item) => item.name !== null);

			let activeAccount = accounts.find((acc) => acc.active === true);

			// Menu choices
			const accountChoices = accounts.map((acc) => ({
				name:
					acc.name === activeAccount?.name
						? chalk.green.bold(`${acc.name} (active)`)
						: chalk.white(acc.name),
				value: acc.name,
			}));

			accountChoices.push(
				{ name: chalk.blue("{+} Add New Account"), value: "__add" },
				{ name: chalk.red("{-} Remove Account"), value: "__remove" }
			);

			const action = await select({
				message: chalk.yellow.bold("Select a GitHub account:"),
				choices: accountChoices,
			});

			// ADD NEW ACCOUNT
			if (action === "__add") {
				console.log(chalk.blue("Starting GitHub login..."));
				execSync("gh auth login", { stdio: "inherit" });
				console.log(chalk.green("Account added successfully."));
				return;
			}

			// REMOVE ACCOUNT
			if (action === "__remove") {
				if (!accounts.length)
					return console.log(chalk.red("{X} No accounts to remove."));

				const accountToRemove = await select({
					message: chalk.red.bold("Select an account to remove:"),
					choices: accounts.map((acc) => ({
						name: chalk.red(acc.name),
						value: acc.name,
					})),
				});

				console.log(chalk.red(`{-} Removing ${accountToRemove}...`));
				execSync(
					`gh auth logout --hostname github.com --user "${accountToRemove}"`,
					{ stdio: "inherit" }
				);
				console.log(chalk.green(`Removed ${accountToRemove}`));
				return;
			}

			// SWITCH ACCOUNT
			const selected = action;

			console.log(chalk.yellow(`Switching to ${selected}...`));
			execSync(`gh auth switch --user "${selected}"`, { stdio: "inherit" });

			console.log(chalk.green(`✔ Switched GitHub CLI account → ${selected}`));

			// APPLY GIT CONFIG
			if (gitProfiles[selected]) {
				console.log(chalk.yellow("Updating Git user details..."));

				execSync(
					`git config --global user.name "${gitProfiles[selected].name}"`
				);
				execSync(
					`git config --global user.email "${gitProfiles[selected].email}"`
				);

				console.log(
					chalk.green(
						`✔ Git config updated → ${gitProfiles[selected].name} (${gitProfiles[selected].email})`
					)
				);
			} else {
				console.log(
					chalk.red(
						`⚠ No git profile found for ${selected}. Add it in gitProfiles object.`
					)
				);
			}

			console.log(chalk.green(`🎉 All done! Switched to ${selected}`));
		} catch (err) {
			console.error(chalk.red("ERROR:"), err.message);
		}
	});

program.parse();
