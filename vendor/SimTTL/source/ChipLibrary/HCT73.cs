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
using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT73.
    /// </summary>
    public class HCT73 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hc73.pdf

        private const double TYP_PROPAGATION_DELAY = 13;

        #region Private/Protected Fields
        private SignalState lastCPn1;
        private SignalState lastCPn2;
        #endregion Private/Protected Fields

        #region FF1 Pins
        public Pin I1CPn;
        public Pin I1Rn;
        public Pin I1J;
        public Pin I1K;
        public Pin O1Q;
        public Pin O1Qn;
        #endregion FF1 Pins

        #region FF2 Pins
        public Pin I2CPn;
        public Pin I2Rn;
        public Pin I2J;
        public Pin I2K;
        public Pin O2Q;
        public Pin O2Qn;
        #endregion FF2 Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT73(string Name) : this(Name, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT73(string Name, Net NetI1CPn, Net NetI1Rn, Net NetI1J, Net NetI1K, Net NetI2CPn, Net NetI2Rn, Net NetI2J, Net NetI2K) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "4");
            this.Ground[0] = new Pin(this, "GND", "11");

            this.I1CPn = new Pin(this, "1CPn", "1", LineMode.In, SignalState.L, NetI1CPn);
            this.I1Rn = new Pin(this, "1Rn", "2", LineMode.In, SignalState.L, NetI1Rn);
            this.I1J = new Pin(this, "1J", "14", LineMode.In, SignalState.L, NetI1J);
            this.I1K = new Pin(this, "1K", "3", LineMode.In, SignalState.L, NetI1K);
            this.O1Q = new Pin(this, "1Q", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O1Qn = new Pin(this, "1Qn", "13", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            lastCPn1 = SignalState.L;

            this.I2CPn = new Pin(this, "2CPn", "5", LineMode.In, SignalState.L, NetI2CPn);
            this.I2Rn = new Pin(this, "2Rn", "6", LineMode.In, SignalState.L, NetI2Rn);
            this.I2J = new Pin(this, "2J", "7", LineMode.In, SignalState.L, NetI2J);
            this.I2K = new Pin(this, "2K", "10", LineMode.In, SignalState.L, NetI2K);
            this.O2Q   = new Pin(this, "2Q",   "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Qn  = new Pin(this, "2Qn",  "8", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            lastCPn2 = SignalState.L;

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.I1CPn, this.I1Rn, this.I1J, this.I1K });
            SetPinArray(Inputs, 1, new Pin[] { this.I2CPn, this.I2Rn, this.I2J, this.I2K });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, new Pin[] { this.O1Q, this.O1Qn });
            SetPinArray(Outputs, 1, new Pin[] { this.O2Q, this.O2Qn });

        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Implementation of the JK-Flip-Flop function.
        /// </summary>
        /// <param name="lastCPn">Clock state from the last time.</param>
        /// <param name="CPn">Clock signals triggering on the falling edge.</param>
        /// <param name="Rn">Low active Reset signal</param>
        /// <param name="J">J-Input</param>
        /// <param name="K">K-Input</param>
        /// <param name="Q">Output</param>
        /// <param name="Qn">Output inverted.</param>
        protected void JKFF(ref SignalState lastCPn, Pin CPn, Pin Rn, Pin J, Pin K, Pin Q, Pin Qn)
        {
            if (Rn.State == SignalState.L)
            {
                Q.NewOutState = SignalState.L;
                Qn.NewOutState = SignalState.H;
            }
            else if ((lastCPn == SignalState.H) && (CPn.State == SignalState.L))
            {
                if ((J.State == SignalState.H) && (K.State == SignalState.H))
                {
                    if (Q.State == SignalState.L)
                    {
                        Q.NewOutState = SignalState.H;
                        Qn.NewOutState = SignalState.L;
                    }
                    else
                    {
                        Q.NewOutState = SignalState.L;
                        Qn.NewOutState = SignalState.H;
                    }
                }
                else if (J.State == SignalState.H)
                {
                    Q.NewOutState = SignalState.H;
                    Qn.NewOutState = SignalState.L;
                }
                else if (K.State == SignalState.H)
                {
                    Q.NewOutState = SignalState.L;
                    Qn.NewOutState = SignalState.H;
                }
            }

            lastCPn = CPn.State;
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            JKFF(ref lastCPn1, I1CPn, I1Rn, I1J, I1K, O1Q, O1Qn);
            JKFF(ref lastCPn2, I2CPn, I2Rn, I2J, I2K, O2Q, O2Qn);
        }
        #endregion Public Methods

    }
}
