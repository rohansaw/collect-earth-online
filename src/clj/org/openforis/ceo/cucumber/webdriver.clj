(ns org.openforis.ceo.cucumber.webdriver
  (:require [clojure.java.io :as io]
            [org.openforis.ceo.cucumber.remote :as remote])
  (:import [org.openqa.selenium By WebDriver]
           [org.openqa.selenium.safari SafariDriver]
           [org.openqa.selenium.chrome ChromeDriver]
           [org.openqa.selenium.firefox FirefoxDriver]
           ;;[org.openqa.selenium JavascriptExecutor]
           [org.openqa.selenium.support.ui WebDriverWait ExpectedConditions]))

(defn goto [^WebDriver d url]
  (.get d url))

(defn presence-of [^By by]
  (ExpectedConditions/presenceOfElementLocated by));

(defn quit [^WebDriver driver]
  (.quit driver))

(defn title [^WebDriver driver]
  (.getTitle driver))

(defn wait [^WebDriver driver duration]
  (WebDriverWait. driver duration))

(defn delete-cookies [^WebDriver driver]
  (.. driver (manage) (deleteAllCookies)))

(defn maximize
  "Maxmizes the browser window"
  [^WebDriver d]
  (.. d (manage) (window) (maximize)))

(defn chrome-driver [_]
  (System/setProperty "webdriver.chrome.driver" "/usr/local/bin/chromedriver")
  (ChromeDriver.))

(defn firefox-driver [_]
  (FirefoxDriver.))

(defn safari-driver [_]
  (SafariDriver.))

(defn remote-driver [opts]
  (remote/remote-driver opts))

(defn driver
  "Instantiates a new WebDriver"
  [{:keys [browser remote] :as opts}]
  (println (format "Creating WD -- Remote?: %s Browser: Options: %s" remote opts))
  (if remote
    (remote-driver opts)
    (condp = (keyword browser)
      :chrome (chrome-driver opts)
      :firefox (firefox-driver opts)
      :safari (safari-driver opts))))
