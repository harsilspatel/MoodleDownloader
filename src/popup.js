/**
 * moodleDownloader - a chrome extension for batch downloading Moodle resources 💾
 * Copyright (c) 2018 Harsil Patel
 * https://github.com/harsilspatel/MoodleDownloader
 */
function main() {

	// google analytics
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

		ga('create', 'UA-119398707-1', 'auto');
		ga('set', 'checkProtocolTask', null);
		ga('send', 'pageview');

	// downloadResources on button press
	const button = document.getElementById("downloadResources");
	button.addEventListener("click", () => {
		downloadResources()
	});

	// filter resources on input
	const searchField = document.getElementById("search");
	searchField.addEventListener("input", () => {
		filterOptions()
	});

	// executing background.js to populate the select form
	chrome.tabs.executeScript({file: "./src/background.js"}, result => {
		try {
			const resourceSelector = document.getElementById("resourceSelector");
			const resources = result[0];
			resourcesList = [...resources];
			console.log(result);
			resources.forEach(resource => {
				const resourceOption = document.createElement("option");

				// creating option element such that the text will be
				// the resource name and the option value its url.
				resourceOption.value = resource.url;
				resourceOption.title = resource.name;
				resourceOption.innerHTML = resource.name;
				resourceOption.course = resource.course;
				resourceOption.section = resource.section;
				resourceSelector.appendChild(resourceOption);
			});
		} catch(error) {
			console.log(error);
		}
	});
	initStorage();
}

function initStorage() {
	chrome.storage.sync.get(['downloads', 'alreadyRequested'], result => {
		const downloads = result.downloads ? result.downloads : 0;
		const alreadyRequested = result.alreadyRequested ? result.alreadyRequested : false;
		chrome.storage.sync.set({'downloads': downloads, 'alreadyRequested': alreadyRequested}, function() {
			console.log('initialised storage variables');
		});
	})
}

function requestFeedback() {
	chrome.storage.sync.get(['downloads', 'alreadyRequested'], result => {
		console.log('inside requestFeedback')
		if (result.downloads >= 50 && result.alreadyRequested == false) {
			console.log('attaching ')
			const nah = document.getElementById("nah");
			const sure = document.getElementById("sure");
			const feedbackDiv = document.getElementById("feedbackDiv");
			const feedbackPrompt = document.getElementById("feedbackPrompt");
			feedbackDiv.removeAttribute('hidden');

			nah.addEventListener("click", () => {
				chrome.storage.sync.set({'alreadyRequested': true}, function() {
					console.log('alreadyRequested is set to ' + true);
				});
				nah.setAttribute('hidden', 'hidden');
				sure.setAttribute('hidden', 'hidden');
				feedbackPrompt.innerHTML = "No problem, you have a good one! 😄"
				setTimeout(() => {
					feedbackDiv.setAttribute('hidden', 'hidden');
				}, 2000);
			});

			sure.addEventListener("click", () => {
				chrome.storage.sync.set({'alreadyRequested': true}, function() {
					console.log('alreadyRequested is set to ' + true);
				});
				nah.setAttribute('hidden', 'hidden');
				sure.setAttribute('hidden', 'hidden');
				feedbackPrompt.innerHTML = "Thanks so much 💝"
				setTimeout(() => {
					feedbackDiv.setAttribute('hidden', 'hidden');
					chrome.tabs.create({url: 'https://chrome.google.com/webstore/detail/moodle-downloader/ohhocacnnfaiphiahofcnfakdcfldbnh'})
				}, 2000);

			});

		}
	});
}

function filterOptions() {
	const searchField = document.getElementById("search");
	const query = searchField.value.toLowerCase();
	const regex = new RegExp(query, "i");
	const options = document.getElementById("resourceSelector").options;

	resourcesList.forEach((resource, index) => {
		resource.name.match(regex) ?
		options[index].removeAttribute('hidden') :
		options[index].setAttribute('hidden', 'hidden');
	});
}

function updateDownloads(newDownloads) {
	chrome.storage.sync.get(['downloads'], result => {
		const value = result.downloads ? result.downloads : 0;
		console.log('Value currently is ' + value);
		const newValue = value + newDownloads;
		console.log(typeof value);
		chrome.storage.sync.set({'downloads': newValue}, function() {
			console.log('Value is set to ' + newValue);
		});
	});
}

let organizeChecked = false;
let replaceFilename = false;

function suggestFilename(downloadItem, suggest) {
	const item = resourcesList.filter(r => r.url==downloadItem.url)[0];
	let filename = downloadItem.filename;

	if (replaceFilename) {
		const lastDot = filename.lastIndexOf(".");
		const extension = lastDot === -1 ? "" : filename.slice(lastDot);
		filename = item.name + extension;
	}

	if (organizeChecked) {
		suggest({filename:
			item.course.replace("/", "-") + '/' +
			item.section.replace("/", "-") + '/' +
			filename
		});
	} else {
		suggest(filename);
	}
}

function downloadResources() {
	const INTERVAL = 500;
	const footer = document.getElementById("footer");
	const button = document.getElementById("downloadResources");
	const resourceSelector = document.getElementById("resourceSelector");
	const selectedOptions = Array.from(resourceSelector.selectedOptions);
	organizeChecked = document.getElementById('organize').checked;
	replaceFilename = document.getElementById('replaceFilename').checked;
	const hasDownloadsListener = chrome.downloads.onDeterminingFilename.hasListener(suggestFilename);

	// add listener to organize files
	if (!hasDownloadsListener)
		chrome.downloads.onDeterminingFilename.addListener(suggestFilename);

	// hidding the button and showing warning text
	button.setAttribute('hidden', 'hidden');
	const warning = document.createElement("small");
	warning.style.color = "red";
	warning.innerHTML = "Please keep this window open until selected resources are not downloaded...";
	footer.appendChild(warning);

	// updating stats
	updateDownloads(selectedOptions.length);

	// showing the button and removing the text and requesting for feedback
	setTimeout(() => {
		footer.removeChild(warning);
		button.removeAttribute('hidden');
		requestFeedback();
	}, (selectedOptions.length+4)*INTERVAL);

	// selectedOptions.forEach(option => chrome.downloads.download({url: option.value}));
	selectedOptions.forEach((option, index) => {
		setTimeout(() => {
			chrome.downloads.download({url: option.value})
		}, index*INTERVAL);
	});

	ga('send', 'event', {
		'eventCategory': 'click',
		'eventAction': 'downloadResources',
		'eventValue': selectedOptions.length
	  });
}

document.addEventListener('DOMContentLoaded', () => {
	main();
	var resourcesList = []
});
