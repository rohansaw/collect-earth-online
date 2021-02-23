(ns org.openforis.ceo.cucumber.core
  (:require [clojure.java.io :as io]
            [clojure.string :as s]
            [org.openforis.ceo.cucumber.webdriver :as w]
            [org.openforis.ceo.cucumber.steps :refer [find-step]])
  (:import [java.io File FilenameFilter]))

(def path-env (System/getenv "PATH"))

(defn- read-steps [^File feature]
  (let [feature-name (.getName feature)
        lines (->> feature slurp s/split-lines (map s/trim))
        steps (map find-step lines)]
    {:feature feature-name :steps steps}))

(defn- run-feature-steps [context features]
  (doseq [feature features]
    (doseq [{:keys [step-name fun]} (:steps feature)]
      (println step-name)
      (try (fun context)
           (catch Exception e (str "Error in " step-name ", caught exception: " (.getMessage e)))))))

(defn run-cucumber-tests [driver]
  (let [features-dir (io/file "./features")
        feature-files (seq (.listFiles features-dir))
        features (map #(read-steps %) feature-files)
        context {:driver driver}]
    (run-feature-steps context features)))

(defn -main [& args]
  (condp = (first args)
    "chrome" (run-cucumber-tests (w/chrome-driver))
    "firefox" (run-cucumber-tests (w/firefox-driver))
    "safari" (run-cucumber-tests (w/safari-driver))
    (println "Valid options are:\n  (firefox|chrome|safari)")))
