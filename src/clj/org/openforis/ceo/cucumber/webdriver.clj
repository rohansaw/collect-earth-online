(ns org.openforis.ceo.cucumber.webdriver
  (:require [clojure.java.io :as io]
            [org.openforis.ceo.cucumber.remote :refer [remote-driver]])
  (:import [org.openqa.selenium By Keys WebDriver WebElement]
           [org.openqa.selenium.safari SafariDriver]
           [org.openqa.selenium.chrome ChromeDriver]
           [org.openqa.selenium.firefox FirefoxDriver]
           ;;[org.openqa.selenium JavascriptExecutor]
           [org.openqa.selenium.support.ui WebDriverWait ExpectedConditions])
  )

(defn ^WebElement find-el [driver ^By by]
  (.findElement driver by))

(defn find-els [driver ^By by]
  (.findElements driver by))

(defn presence-of [^By by]
  (ExpectedConditions/presenceOfElementLocated by));

(defn wait [^WebDriver driver duration]
  (WebDriverWait. driver duration))

(defn send-keys [^WebElement e ^java.lang.CharSequence s]
  ;; Can't just pass string directory, needs to be Java array
  (.sendKeys e (into-array [s])))

(defn click [^WebElement e]
  (.click e))

(defn goto [^WebDriver d url]
  (.get d url))

(defn maximize
  "Maxmizes the browser window"
  [^WebDriver d]
  (.. d (manage) (window) (maximize)))

(defn chrome-driver []
  (System/setProperty "webdriver.chrome.driver" "/usr/local/bin/chromedriver")
  (ChromeDriver.))

(defn firefox-driver []
  (FirefoxDriver.))

(defn safari-driver []
  (SafariDriver.))

(defn driver [browser & opts]
  (condp = browser
    :chrome (chrome-driver)
    :firefox (firefox-driver)
    :safari (safari-driver)
    :remote (remote-driver opts)))
