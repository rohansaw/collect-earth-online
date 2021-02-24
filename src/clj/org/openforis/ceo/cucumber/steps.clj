(ns org.openforis.ceo.cucumber.steps
  (:require [org.openforis.ceo.cucumber.by :as by]
            [org.openforis.ceo.cucumber.utils :as u]
            [org.openforis.ceo.cucumber.webdriver :as w])
  (:import [org.openqa.selenium Keys]))

(def all-steps (atom []))

;; Private

(defn- step-maker [phrase f]
  (swap! all-steps conj {:match (re-pattern phrase) :fun f}))

(defn- Given [phrase f]
  (step-maker phrase f))

(defn- When [phrase f]
  (step-maker phrase f))

(defn- Then [phrase f]
  (step-maker phrase f))

(defn- unknown-def [step-name]
  (fn [_] (println "Could not find definition for: '" step-name "'")))

;; Public
(defn find-step [step-name]
  (let [step-defs (filter #(re-find (:match %) step-name) @all-steps)
        fun (-> (or (first step-defs) {}) (get :fun (unknown-def step-name)))]
    {:step-name step-name :fun fun}))

;; Steps

(Given "I am a visitor"
      (fn [{:keys [driver]}]
        (w/maximize driver)
        (w/goto driver "https://collect.earth")
        (let [wait (w/wait driver 10)]
          (.until wait (w/presence-of (by/css "input"))))))

(When "I search for an institution"
      (fn [{:keys [driver]}]
        (let [input (w/find-el driver (by/css "input"))] ;; seconds
          (w/click input)
          (w/send-keys input "FAO"))))

(Then "I can see matching institutions"
      (fn [{:keys [driver]}]
        (let [_ (w/wait driver 2)]
          (u/sleep 2000)
          (let [tree (w/find-el driver (by/css "ul.tree"))
                institutions (w/find-els tree (by/css "li"))]
            (println (map #(w/find-el % (by/css "div.d-flex")) (seq institutions)))
            (println tree institutions)))))

