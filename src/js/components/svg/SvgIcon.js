import React from "react";
import PropTypes from "prop-types";
import {alertIcon} from "./alertIcon";
import {cancelIcon} from "./cancelIcon";
import {checkIcon} from "./checkIcon";
import {closeIcon} from "./closeIcon";
import {downCaretIcon} from "./downCaretIcon";
import {downRightArrowIcon} from "./downRightArrowIcon";
import {drawIcon} from "./drawIcon";
import {editIcon} from "./editIcon";
import {helpIcon} from "./helpIcon";
import {infoIcon} from "./infoIcon";
import {leftArrowIcon} from "./leftArrowIcon";
import {leftDoubleIcon} from "./leftDoubleIcon";
import {lineStringIcon} from "./lineStringIcon";
import {minus} from "./minus";
import {plus} from "./plus";
import {pointIcon} from "./pointIcon";
import {polygonIcon} from "./polygonIcon";
import {questionIcon} from "./questionIcon";
import {rightArrowIcon} from "./rightArrowIcon";
import {rightCaretIcon} from "./rightCaretIcon";
import {rightDoubleIcon} from "./rightDoubleIcon";
import {ruleIcon} from "./ruleIcon";
import {saveIcon} from "./saveIcon";
import {settingsIcon} from "./settingsIcon";
import {trashIcon} from "./trashIcon";
import {upArrowIcon} from "./upArrowIcon";
import {upCaretIcon} from "./upCaretIcon";
import {zoomInIcon} from "./zoomInIcon";

const iconMap = {
    "alert": alertIcon,
    "cancel": cancelIcon,
    "check": checkIcon,
    "close": closeIcon,
    "downCaret": downCaretIcon,
    "downRightArrow": downRightArrowIcon,
    "draw": drawIcon,
    "edit": editIcon,
    "help": helpIcon,
    "info": infoIcon,
    "leftArrow": leftArrowIcon,
    "leftDouble": leftDoubleIcon,
    "lineString": lineStringIcon,
    "minus": minus,
    "plus": plus,
    "point": pointIcon,
    "polygon": polygonIcon,
    "question": questionIcon,
    "rightArrow": rightArrowIcon,
    "rightCaret": rightCaretIcon,
    "rightDouble": rightDoubleIcon,
    "rule": ruleIcon,
    "save": saveIcon,
    "settings": settingsIcon,
    "trash": trashIcon,
    "upArrow": upArrowIcon,
    "upCaret": upCaretIcon,
    "zoomIn": zoomInIcon
};

function SvgIcon({icon, color, cursor, size}) {
    return (
        <div
            className="svg-icon"
            style={{
                color,
                cursor,
                fill: color,
                height: size,
                maxHeight: size,
                maxWidth: size,
                width: size
            }}
        >
            {iconMap[icon]}
        </div>
    );
}

SvgIcon.propTypes = {
    color: PropTypes.string,
    cursor: PropTypes.string,
    icon: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired
};

SvgIcon.defaultProps = {
    color: "currentColor",
    cursor: null
};

export default SvgIcon;
