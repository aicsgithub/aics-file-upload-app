import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import StatusBar, {
    MILLISECONDS_PER_SECOND,
    SECONDS_IN_A_DAY,
    SECONDS_IN_A_MINUTE,
    SECONDS_IN_AN_HOUR
} from "../";

import { AlertType, AppEvent } from "../../../state/feedback/types";

describe("<StatusBar/>", () => {
    const message = "Something happened";
    const getStatusText = () => shallow(<StatusBar event={event} limsUrl="url"/>).find(".status").text();
    let event: AppEvent;

    beforeEach(() => {
        event = {
            date: new Date(),
            message,
            type: AlertType.ERROR,
        };
    });

    it("displays an empty string if event is not defined", () => {
        const wrapper = shallow(<StatusBar event={undefined} limsUrl="url"/>);

        expect(wrapper.find(".status").text()).to.be.empty;
    });

    it("returns (moments ago) if date is 20 seconds ago", () => {
        event = {
            ...event,
            date: new Date(Date.now() - 20 * MILLISECONDS_PER_SECOND),
        };
        const result = getStatusText();
        expect(result).to.equal(`${message} (moments ago)`);
    });

    it("returns (3 minutes ago) if date is around 3 minutes ago", () => {
        event = {
            ...event,
            date: new Date(Date.now() - 3 * SECONDS_IN_A_MINUTE * MILLISECONDS_PER_SECOND),
        };
        const result = getStatusText();
        expect(result).to.equal(`${message} (3 minutes ago)`);
    });

    it("returns time event occurred at if more than an hour ago", () => {
        const date = new Date(Date.now() - 3 * SECONDS_IN_AN_HOUR * MILLISECONDS_PER_SECOND);
        event = {
            ...event,
            date,
        };
        const result = getStatusText();
        expect(result).to.contain("(today");
    });

    it("clears message if event occurred more than a day ago", () => {
        event = {
            ...event,
            date: new Date(Date.now() - SECONDS_IN_A_DAY * MILLISECONDS_PER_SECOND),
        };
        const result = getStatusText();
        expect(result).to.be.empty;
    });
});
