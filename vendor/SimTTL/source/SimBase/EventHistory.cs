// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A class to store one entry in the event history.
    /// </summary>
    public struct HistoryEntry
    {
        /// <summary>Time of the event.</summary>
        public double Time;
        /// <summary>State at this time.</summary>
        public SignalState State;

        /// <summary>
        /// Creates the HistoryEntry instance
        /// </summary>
        /// <param name="Time">Time of the event.</param>
        /// <param name="State">State at this time.</param>
        public HistoryEntry(double Time, SignalState State)
        {
            this.Time = Time;
            this.State = State;
        }
    }

    /// <summary>
    /// A class to store the history of events.
    /// </summary>
    public class EventHistory
    {
        /// <summary>Owner pin of this history.</summary>
        public readonly Pin Owner;
        /// <summary>List of history entries.</summary>
        private List<HistoryEntry> history;

        /// <summary>
        /// Creates the EventHistory instance.
        /// </summary>
        /// <param name="Owner">Owner pin of this history.</param>
        public EventHistory(Pin Owner)
        {
            this.Owner = Owner;
            this.history = new List<HistoryEntry>();
        }

        /// <summary>
        /// Resets the history event list.
        /// </summary>
        public void ResetHistory()
        {
            this.history.Clear();
        }

        /// <summary>
        /// Add a new event entry to the history.
        /// </summary>
        /// <param name="Time">Time of the event.</param>
        /// <param name="State">State at this time.</param>
        public void Add(double Time, SignalState State)
        {
            history.Add(new HistoryEntry(Time, State));
        }

        /// <summary>
        /// Find the index of the entry that is valid for the requested time.
        /// </summary>
        /// <param name="Time">Time to check.</param>
        /// <returns>Index of the entry that is active at the requested time.</returns>
        public int FindIndex(double Time)
        {

            if (history.Count == 0)
                return -1;

            if (Time <= 0)
                return 0;

            if (Time >= history[history.Count - 1].Time)
                return history.Count - 1;

            int idx = 0;
            int step = history.Count / 2;
            while (step > 0)
            {
                if (Time >= history[idx + step].Time)
                {
                    idx += step;
                    step = Math.Max(step, 2);
                }

                step = step / 2;
            }

            return idx;
        }

        /// <summary>
        /// Find the index of the entry that is valid for the requested time.
        /// </summary>
        /// <param name="Time">Time to check.</param>
        /// <returns>SignalState of the entry that is active at the requested time.</returns>
        public SignalState FindState(double Time)
        {
            if (history.Count == 0)
                 return SignalState.U;

            return history[FindIndex(Time)].State;
        }

        /// <summary>
        /// Shorten the history to the new maximum time.
        /// </summary>
        /// <param name="NewMaxTime">New maximum time to shorten the history to.</param>
        public void Shorten(double NewMaxTime)
        {
            while ((history.Count > 0) && (history[history.Count-1].Time > NewMaxTime))
                history.RemoveAt(history.Count-1);
        }

        /// <summary>
        /// Get the event entry at the given index.
        /// </summary>
        /// <param name="Index">Index of the history entry to return.</param>
        /// <returns>Entry in the history list at the given index.</returns>
        public HistoryEntry this[int Index]
        {
            get { return history[Index]; }
        }

        /// <summary>
        /// Gets the number history entries.
        /// </summary>
        public int Count
        {
            get { return history.Count; }
        }
    }
}
