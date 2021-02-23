(ns org.openforis.ceo.cucumber
  (:import [org.openqa.selenium By Keys WebDriver WebElement]
           [org.openqa.selenium.safari SafariDriver]
           [org.openqa.selenium.chrome ChromeDriver]
           [org.openqa.selenium.firefox FirefoxDriver]
           [org.openqa.selenium.support.ui WebDriverWait ExpectedConditions]
           [java.time Duration])
  (:require [clojure.java.io :as io]
            [clojure.java.shell :as sh]
            [clojure.string :as str]))
(def path-env (System/getenv "PATH"))

(defn find-by [^WebDriver driver ^By by]
  (.findElement driver by))

(defn- find-by-class [^WebDriver d class-name]
  (find-by d (By/className class-name)))

(defn- find-by-css [^WebDriver d css]
  (find-by d (By/cssSelector css)))

(defn- find-by-name [^WebDriver d name]
  (find-by d (By/name name)))

(defn- find-by-id [^WebDriver d id]
  (find-by d (By/id id)))

(defn- presence-of [^By by]
  (ExpectedConditions/presenceOfElementLocated by));

(defn- send-keys [^WebElement e ^java.lang.CharSequence s]
  (.sendKeys e s))

(defn- chrome-driver []
  (System/setProperty "webdriver.chrome.driver" "/usr/local/bin/chromedriver")
  (ChromeDriver.))

(defn- firefox-driver []
  (FirefoxDriver.))

(defn- safari-driver []
  (SafariDriver.))

(defn run-cucumber-tests [driver]
  (println "Starting Webdriver")
  (println driver)
  (.get driver "https://collect.earth")
  (.. driver (manage) (window) (maximize)) ;; Maximize window
  (send-keys (find-by-css driver "input.form-control") "FAO")
  (println (find-by-css driver "ul.tree > li")))

(defn -main [& args]
  (condp = (first args)
    "chrome" (run-cucumber-tests (chrome-driver))
    "firefox" (run-cucumber-tests (firefox-driver))
    "safari" (run-cucumber-tests (safari-driver))
    (println "Valid options are:\n  (firefox|chrome|safari)")))
