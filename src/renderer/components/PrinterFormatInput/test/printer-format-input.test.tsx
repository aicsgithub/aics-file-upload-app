import { expect } from "chai";

import PrinterFormatInput from "../index";

describe("<PrinterFormatInput/>", () => {
    it("returns undefined if string is valid", () => {
        const result = PrinterFormatInput.validateInput("4, 1  ,  3 -  10, 3-100, 1000-1004, 4, 7");
        expect(result).to.be.undefined;
    });

    it("return error message if one side of comma is empty", () => {
        const result = PrinterFormatInput.validateInput("4, 1, 3-10, 3-8,5,,1");
        expect(result).to.contain("is empty");
    });

    it("return error message if one side of range is empty", () => {
        const result = PrinterFormatInput.validateInput("4, 1, 3-10, 3-,5");
        expect(result).to.contain("valid range");
    });

    it("returns error message if left side of range is larger than right side", () => {
        const result = PrinterFormatInput.validateInput("4, 1, 3-10, 104-103");
        expect(result).to.contain("uneven range");
    });

    it("returns error message if multiple dashes are in a row", () => {
        const result = PrinterFormatInput.validateInput("4, 1, 3-10, 3--4");
        expect(result).to.contain("not valid range");
    });

    it("returns undefined if string is empty", () => {
        const result = PrinterFormatInput.validateInput("");
        expect(result).to.be.undefined;
    });

    it("extracts expected range", () => {
        const result = PrinterFormatInput.extractValues("4, 1, 3-10, 7");
        expect(result).to.eql([4, 1, 3, 5, 6, 7, 8, 9, 10]);
    });

    it("extracts empty range", () => {
        const result = PrinterFormatInput.extractValues("");
        expect(result).to.be.empty;
    });

    it("returns undefined given bad input", () => {
        const result = PrinterFormatInput.extractValues("4, 1, 3-10, 3-100, 1000-104, 4, 7,");
        expect(result).to.be.undefined;
    });
});
