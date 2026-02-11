// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A descendant of the base element specifically targeting clocked chips.
    /// </summary>
    public class ClockedChip:BaseElement
    {
        /// <summary>Reset pin</summary>
        protected Pin RST;
        /// <summary>Clock pin</summary>
        protected Pin CLK;
        /// <summary>Internally used last state of the clock</summary>
        protected SignalState LastClockState;
        /// <summary>Active low or high to reset the chip.</summary>
        protected SignalState ResetState;

        /// <summary>
        /// Creates the instance of ClockedChip.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="ClkName">Name of the clock pin.</param>
        /// <param name="ClkPinNo">Pin number of the clock pin.</param>
        /// <param name="NetCLK">Net connected to the clock pin.</param>
        /// <param name="RstName">Reset pin name.</param>
        /// <param name="RstPinNo">Reset pin number.</param>
        /// <param name="NetRST">Net connected to the reset pin.</param>
        /// <param name="ResetState">Active low or high to reset the chip.</param>
        public ClockedChip(string Name, string ClkName, string ClkPinNo, Net NetCLK, string RstName, string RstPinNo, Net NetRST, SignalState ResetState) : base(Name)
        {
            this.CLK = new Pin(this, ClkName, ClkPinNo, LineMode.In, SignalState.U, NetCLK);
            this.RST = new Pin(this, RstName, RstPinNo, LineMode.In, SignalState.U, NetRST);
            this.ResetState = ResetState;
            LastClockState = CLK.State;
        }

        /// <summary>
        /// Creates the instance of ClockedChip.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="ClkName">Name of the clock pin.</param>
        /// <param name="ClkPinNo">Pin number of the clock pin.</param>
        /// <param name="NetCLK">Net connected to the clock pin.</param>
        /// <param name="RstName">Reset pin name.</param>
        /// <param name="RstPinNo">Reset pin number.</param>
        /// <param name="NetRST">Net connected to the reset pin.</param>
        public ClockedChip(string Name, string ClkName, string ClkPinNo, Net NetCLK, string RstName, string RstPinNo, Net NetRST) : base(Name)
        {
            this.CLK = new Pin(this, ClkName, ClkPinNo, LineMode.In, SignalState.U, NetCLK);
            this.RST = new Pin(this, RstName, RstPinNo, LineMode.In, SignalState.U, NetRST);
            this.ResetState = SignalState.L;
            LastClockState = CLK.State;
        }

        /// <summary>
        /// Creates the instance of ClockedChip.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="ClkName">Name of the clock pin.</param>
        /// <param name="ClkPinNo">Pin number of the clock pin.</param>
        /// <param name="NetCLK">Net connected to the clock pin.</param>
        public ClockedChip(string Name, string ClkName, string ClkPinNo, Net NetCLK) : base(Name)
        {
            this.CLK = new Pin(this, ClkName, ClkPinNo, LineMode.In, SignalState.U, NetCLK);
            this.RST = new Pin(this, "H", "", LineMode.In, SignalState.H, 0);
            this.ResetState = SignalState.L;
            LastClockState = CLK.State;
        }

        /// <summary>
        /// Reset the chip.
        /// </summary>
        protected virtual void ResetChip()
        {
            //LastClockState = CLK.State;
        }

        /// <summary>
        /// Virtual method to be called after the rising edge of the clock is detected.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected virtual void RisingEdge(double Time) { }

        /// <summary>
        /// Virtual method to be called after the falling edge of the clock is detected.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected virtual void FallingEdge(double Time) { }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            //if ((Name == "U48") && (Time >= 10855))
            //    Debug.WriteLine("");

            base.Update(Time);

            if (RST.State == ResetState)
                ResetChip();
            else
            {
                if (CLK.State != LastClockState)
                {
                    if (CLK.State == SignalState.H)
                        RisingEdge(Time);
                    else if (CLK.State == SignalState.L)
                        FallingEdge(Time);

                    LastClockState = CLK.State;
                }               
            }
        }

    }
}
