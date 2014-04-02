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
                wordLineNumber: 6
            },
            preview: {
                linesCount: 20,
                wordLineNumber: ko.observable(6)
            },
            timer: {
                interval: 150,
                intervalChangeStep: 1.1,
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
        currentTextLine: ko.observable(0),

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

        getLineNumber: function (previewLineIndex) {
            var index = this.currentTextLine() - this.settings.preview.linesCount - this.settings.preview.wordLineNumber() + previewLineIndex + 1;
            if (index <= 0 || index > this.textArray.length - this.settings.preview.linesCount) return "";
            return index;
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
            this.applyWord(this.currentWord, this.scrollLines(index - this.settings.preview.wordLineNumber()));
        },

        increaseIntervalClick: function() {
            this.settings.timer.interval *= this.settings.timer.intervalChangeStep;
        },

        decreaseIntervalClick: function () {
            this.settings.timer.interval /= this.settings.timer.intervalChangeStep;
        },

        loadText: function (content) {
            this.textArray = splitTextToWords(content, this.settings);
        },

        startReading: function () {
            this.loadText(getFileContent());

            this.settings.preview.wordLineNumber(6);
            this.currentTextLine(this.settings.preview.linesCount);

            for (var i = 0; i < this.settings.preview.linesCount; i++) {
                this.visibleLines.push({
                    line: ko.observable(this.textArray[i].join(" ")),
                    words: this.textArray[i],
                    index: ko.observable(i)
            });
            }

            this.currentWord.lineNumber = this.settings.preview.wordLineNumber();
            this.currentWord.position = 0;

            this._backupWordInObject(this.currentWord);
            this._decorateWord(this.currentWord);
        },

        moveNext: function () {
            var word = this.applyWord(this.currentWord, this._getNextWordCoordinates);
            return this.getIntervalCorrection(word.value());
        },

        applyWord: function (word, setCoordinatesFunc, previousWordValue) {
            this._restoreWordFromObject(word);
            this.previousWord(previousWordValue ? previousWordValue : word.value());

            setCoordinatesFunc.call(this);
            this._backupWordInObject(word);
            this._decorateWord(word);

            var visibleLines = this.visibleLines();
            var nextWordPosition = word.position + 1;
            var currentLineNumber = word.lineNumber;

            this.nextWord(visibleLines[currentLineNumber].words.length > nextWordPosition
                            ? visibleLines[currentLineNumber].words[nextWordPosition]
                            : visibleLines[currentLineNumber + 1].words[0]);
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
            
            this.currentTextLine(this.currentTextLine() + 1);
            this._addTextToBottomOfVisibleLines(this.currentTextLine());
        },

        scrollLines: function (numberOfLines) {
            return function() {
                this.currentWord.position = -1;
                var currentTextLineNewValue = this.currentTextLine() + numberOfLines,
                    previewlinesCount = this.settings.preview.linesCount;

                //check boundaries of text array
                if (currentTextLineNewValue - previewlinesCount < 0) {
                    currentTextLineNewValue = previewlinesCount;
                } else if (currentTextLineNewValue > this.textArray.length) {
                    currentTextLineNewValue = this.textArray.length;
                }

                this.currentTextLine(currentTextLineNewValue);

                for (var i = this.currentTextLine() - previewlinesCount; i < this.currentTextLine() ; i++) {
                    this._addTextToBottomOfVisibleLines(i);
                }
            };
        },

        _addTextToBottomOfVisibleLines: function (textArrayIndex) {
            if (this.visibleLines().length >= this.settings.preview.linesCount) {
                this.visibleLines.shift();
            }
            //check for end of lines in text array
            if (this.textArray.length > textArrayIndex) {
                this.visibleLines.push({
                    line: ko.observable(this.textArray[textArrayIndex].join(" ")),
                    words: this.textArray[textArrayIndex],
                    index: ko.observable(textArrayIndex)
                });
            }
        },

        _getNextWordCoordinates: function () {
            var wordObject = this.currentWord;
            if (this.visibleLines()[wordObject.lineNumber].words.length <= wordObject.position + 1) {
                wordObject.position = -1;
                this.moveNextLine();
            }
            wordObject.position += 1;
        },

        _decorateWord: function (wordObject) {
            var result = this.visibleLines()[wordObject.lineNumber];
            result.words[wordObject.position] = "<span>" + result.words[wordObject.position] + "</span>";
            result.line(result.words.join(" "));
        },
        _backupWordInObject: function (wordObject) {
            wordObject.value(this.visibleLines()[wordObject.lineNumber].words[wordObject.position]);
            this._splitWord(wordObject);
        },
        _splitWord: function (wordObject) {
            var word = wordObject.value();
            var index = (word.indexOf(" ") > 0) ? Math.floor((word.length - word.indexOf(" ")) / 3) + word.indexOf(" ") : Math.floor(word.length / 3);
            wordObject.leftPart(word.substr(0, index).replace(" ", "&nbsp;"));
            wordObject.middleLetter(word[index]);
            wordObject.rightPart(word.substr(index + 1));
        },
        _restoreWordFromObject: function (wordObject) {
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

        //fill array with empty first strings to show them above current string while reading
        for (var i = 0; i < settings.preview.wordLineNumber(); i++) {
            wordsArray.push([]);
        }

        for (var i = 0; i < linesArray.length; i++) {
            var lineWords = linesArray[i].split(" ");
            wordsArrayCurrentLineLength = 0;
            wordsArrayCurrentLine = [];
            for (var j = 0; j < lineWords.length; j++) {
                if (lineWords[j].length > 0) {
                    if (wordsArrayCurrentLineLength + lineWords[j].length >= settings.parser.previewLineLength) {
                        wordsArray.push(wordsArrayCurrentLine);
                        wordsArrayCurrentLineLength = 0;
                        wordsArrayCurrentLine = [];
                    }

                    currentWord = lineWords[j];
                    if (previousWord.length <= settings.parser.prepositionMaxLength && currentWord.length <= settings.parser.wordAfterPrepositionMaxLength && !containsPunctuation(previousWord)) {
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

        //fill array with empty last strings to show them below current string at the end
        for (var i = 0; i < settings.preview.linesCount - settings.preview.wordLineNumber() ; i++) {
            wordsArray.push([]);
        }

        return wordsArray;
    }

    ko.applyBindings(ViewerModel, document.getElementById('content'));

    ViewerModel.startReading();

    function getFileContent() {
        return "Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only STARTHERE!!! an, action a JSON a JSON an to do. It is desighned for live of us. It is desighned for live of us. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to anActiveRecord graphandthensaveit to yourtabase. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE staonlyreallyinteresting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really ";
    }
})();