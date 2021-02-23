(ns org.openforis.ceo.cucumber.webdriver
  (:import [org.openqa.selenium By Keys WebDriver WebElement]
           [org.openqa.selenium.safari SafariDriver]
           [org.openqa.selenium.chrome ChromeDriver]
           [org.openqa.selenium.firefox FirefoxDriver]
           ;;[org.openqa.selenium JavascriptExecutor]
           [org.openqa.selenium.support.ui WebDriverWait ExpectedConditions])
  (:require [clojure.java.io :as io]))

(defn find-el [driver ^By by]
  (.findElement driver by))

(defn presence-of [^By by]
  (ExpectedConditions/presenceOfElementLocated by));

(defn wait [^WebDriver driver duration]
  (WebDriverWait. driver duration))

(defn send-keys [^WebElement e ^java.lang.CharSequence s]
  (.sendKeys e s))

(defn click [^WebElement e]
  (.click e))

(defn chrome-driver []
  (System/setProperty "webdriver.chrome.driver" "/usr/local/bin/chromedriver")
  (ChromeDriver.))

(defn firefox-driver []
  (FirefoxDriver.))

(defn safari-driver []
  (SafariDriver.))

(defn driver [browser]
  (condp = browser
    :chrome (chrome-driver)
    :firefox (firefox-driver)
    :safari (safari-driver)))
