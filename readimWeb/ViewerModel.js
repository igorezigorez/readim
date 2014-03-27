(function () {

    function splitByLineBreaks(text) {
        return text.split(/\r\n|\r|\n/g);
    }
    function containsPunctuation(word) {
        return word.match(/[^\w\s]/g);
    }

    var ViewerModel = {
        settings: {
            parser: {
                prepositionMaxLength: 2,
                wordAfterPrepositionMaxLength: 10,
                previewLineLength: 70,
            },
            preview: {
                linesCount: 20,
                wordLineNumber: ko.observable(6)
            },
            timer: {
                interval: 150,
                spaceCorrection: 1.18,
                wordLengthCorrection: 0.01,
                bigWordLengthCorrection: 1.7,
                punctuationCorrection: 1.18,
                bigWordLength: 9,
                startCorrection: 2.4,
                startCorrectionStep: 0.3
            }
        },

        textArray: [],
        visibleLines: ko.observableArray([]),
        currentTextLine: 0,

        currentWord: {
            lineNumber: 0,
            position: 0,
            value: ko.observable('bbbb'), //todo: remove knockout bind
            leftPart: ko.observable('oooo'),
            middleLetter: ko.observable('V'),
            rightPart: ko.observable('oooo'),
        },

        previousWord: ko.observable('bbbb'),
        nextWord: ko.observable('bbbb'),
        started: false,
        startCorrection: 1,

        moveNextByTimer: function () {
            if (this.started) {
                var timeoutCorrection = this.moveNext();
                var self = this;
                if (this.startCorrection > 1 + this.settings.timer.startCorrectionStep) {
                    this.startCorrection -= this.settings.timer.startCorrectionStep;
                    timeoutCorrection *= this.startCorrection;
                }

                setTimeout(function () { self.moveNextByTimer(); }, self.settings.timer.interval * timeoutCorrection);
            }
        },

        startStop: function () {
            this.started = !this.started;
            if (this.started) {
                this.startCorrection = this.settings.timer.startCorrection;
                this.moveNextByTimer();
            }
        },

        lineClick: function (index) {
            this.startCorrection = this.settings.timer.startCorrection;
            var word = this.applyWord(this.currentWord, this.scrollLines(index - this.settings.preview.wordLineNumber()));
        },

        loadText: function (content) {
            this.textArray = splitTextToWords(content, this.settings.parser);
        },

        startReading: function () {
            this.loadText(getFileContent());

            this.settings.preview.wordLineNumber(6);
            this.currentTextLine = this.settings.preview.linesCount;

            for (var i = 0; i < this.settings.preview.linesCount; i++) {
                this.visibleLines.push({
                    line: ko.observable(this.textArray[i].join(" ")),
                    words: this.textArray[i]
                });
            }

            this.currentWord.lineNumber = this.settings.preview.wordLineNumber();
            this.currentWord.position = 1;
            //this.currentWord.value(this.textArray[this.settings.preview.wordLineNumber()][1]);

            this.backupWordInObject(this.currentWord);
            this.decorateWord(this.currentWord);
        },

        moveNext: function () {
            var word = this.applyWord(this.currentWord, this.getNextWordCoordinates);
            return this.getIntervalCorrection(word.value());
        },

        applyWord: function (word, setCoordinatesFunc, previousWordValue) {
            this.restoreWordFromObject(word);
            this.previousWord(previousWordValue ? word.value() : previousWordValue);

            setCoordinatesFunc.call(this);
            this.backupWordInObject(word);
            this.decorateWord(word);

            var nextWordPosition = word.position + 1;
            var currentLineNumber = word.lineNumber;

            this.nextWord(this.visibleLines()[currentLineNumber].words.length > nextWordPosition
                            ? this.visibleLines()[currentLineNumber].words[nextWordPosition]
                            : this.visibleLines()[currentLineNumber + 1].words[0]);
            return word;
        },

        getIntervalCorrection: function (word) {
            var correction = 1 + (word.length * this.settings.timer.wordLengthCorrection);
            if (word.indexOf(" ") > 0) {
                correction *= this.settings.timer.spaceCorrection;
            }
            if (word.length > this.settings.timer.bigWordLength) {
                correction *= this.settings.timer.bigWordLengthCorrection;
            }
            if (containsPunctuation(word) && containsPunctuation(word).length) {
                correction *= this.settings.timer.punctuationCorrection;
            }
            return correction;
        },

        moveNextLine: function () {

            this.currentTextLine += 1;
            this.visibleLines.shift();
            this.visibleLines.push({
                line: ko.observable(this.textArray[this.currentTextLine].join(" ")),
                words: this.textArray[this.currentTextLine]
            });
        },

        getNextWordCoordinates: function () {
            wordObject = this.currentWord;
            if (this.visibleLines()[wordObject.lineNumber].words.length <= wordObject.position + 1) {
                wordObject.position = -1;
                this.moveNextLine();
            }
            wordObject.position += 1;
        },

        scrollLines: function (numberOfLines) {
            return function () {
                this.currentWord.position = -1;
                this.currentTextLine += numberOfLines;
                this.visibleLines = ko.observableArray([]);
                var firstPreviewLineIndex = this.currentTextLine - this.settings.preview.wordLineNumber();
                for (var i = firstPreviewLineIndex; i < firstPreviewLineIndex + this.settings.preview.linesCount; i++) {
                    this.visibleLines.push({
                        line: ko.observable(this.textArray[i].join(" ")),
                        words: this.textArray[i]
                    });
                }
            }
        },

        decorateWord: function (wordObject) {
            var result = this.visibleLines()[wordObject.lineNumber];
            result.words[wordObject.position] = "<span>" + result.words[wordObject.position] + "</span>";
            result.line(result.words.join(" "));
        },
        backupWordInObject: function (wordObject) {
            wordObject.value(this.visibleLines()[wordObject.lineNumber].words[wordObject.position]);
            this.splitWord(wordObject);
        },
        splitWord: function (wordObject) {
            var word = wordObject.value();
            var index = (word.indexOf(" ") > 0) ? Math.floor((word.length - word.indexOf(" ")) / 3) + word.indexOf(" ") : Math.floor(word.length / 3);
            wordObject.leftPart(word.substr(0, index).replace(" ", "&nbsp;"));
            wordObject.middleLetter(word[index]);
            wordObject.rightPart(word.substr(index + 1));
        },
        restoreWordFromObject: function (wordObject) {
            var result = this.visibleLines()[wordObject.lineNumber];
            result.words[wordObject.position] = wordObject.value();
            result.line(result.words.join(" "));
        },

    };

    function splitTextToWords(text, settings) {
        var wordsArray = [],
            wordsArrayCurrentLineLength,
            wordsArrayCurrentLine,
            linesArray = splitByLineBreaks(text),
            previousWord = "longword",
            currentWord;

        for (var i = 0; i < linesArray.length; i++) {
            var lineWords = linesArray[i].split(" ");
            wordsArrayCurrentLineLength = 0;
            wordsArrayCurrentLine = [];
            for (var j = 0; j < lineWords.length; j++) {
                if (lineWords[j].length > 0) {
                    if (wordsArrayCurrentLineLength + lineWords[j].length >= settings.previewLineLength) {
                        wordsArray.push(wordsArrayCurrentLine);
                        wordsArrayCurrentLineLength = 0;
                        wordsArrayCurrentLine = [];
                    }

                    currentWord = lineWords[j];
                    if (previousWord.length <= settings.prepositionMaxLength && currentWord.length <= settings.wordAfterPrepositionMaxLength && !containsPunctuation(previousWord)) {
                        wordsArrayCurrentLine[wordsArrayCurrentLine.length - 1] += " " + currentWord;
                    }
                    else {
                        wordsArrayCurrentLine.push(currentWord);
                        wordsArrayCurrentLineLength += lineWords[j].length + 1;
                    }
                    previousWord = wordsArrayCurrentLine[wordsArrayCurrentLine.length - 1];
                }
            }
            wordsArray.push(wordsArrayCurrentLine);
        }
        return wordsArray;
    }

    ko.applyBindings(ViewerModel, document.getElementById('content'));

    ViewerModel.startReading();

    function getFileContent() {
        return "Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only STARTHERE!!! an, action a JSON a JSON an to do. It is desighned for live of us. It is desighned for live of us. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to anActiveRecord graphandthensaveit to yourtabase. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE staonlyreallyinteresting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really ";
    }
})();